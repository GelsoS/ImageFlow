"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import UploadProgress from "./UploadProgress"
import UploadSuccessModal from "./UploadSuccessModal"
import "../styles/MediaUploader.css"

function MediaUploader({ directoryId, onMediaUploaded, userId }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [mediaType, setMediaType] = useState("image")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [uploadedMedia, setUploadedMedia] = useState(null)

  function handleFileChange(e) {
    const selectedFile = e.target.files[0]

    if (selectedFile) {
      // Verificar tipo de arquivo
      if (mediaType === "image" && !selectedFile.type.startsWith("image/")) {
        setError("Por favor, selecione apenas arquivos de imagem.")
        setFile(null)
        return
      }

      if (mediaType === "video" && !selectedFile.type.startsWith("video/")) {
        setError("Por favor, selecione apenas arquivos de vídeo.")
        setFile(null)
        return
      }

      setFile(selectedFile)
      setError(null)
    }
  }

  async function simulateUploadProgress(file) {
    const totalSize = file.size
    let uploadedSize = 0

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        // Simular progresso de upload (em produção, você usaria eventos reais do Supabase)
        const increment = totalSize * 0.1 // 10% por vez
        uploadedSize = Math.min(uploadedSize + increment, totalSize)
        const progress = Math.round((uploadedSize / totalSize) * 100)

        setUploadProgress(progress)

        if (progress >= 100) {
          clearInterval(interval)
          resolve()
        }
      }, 500) // Atualizar a cada 500ms
    })
  }

  async function handleUpload(e) {
    e.preventDefault()

    if (!file) {
      setError(`Por favor, selecione um${mediaType === "image" ? "a imagem" : " vídeo"} para upload.`)
      return
    }

    let progressData = null

    try {
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      // Criar registro de progresso no banco
      const { data: progressDataResponse } = await supabase
        .from("upload_progress")
        .insert([
          {
            user_id: userId,
            file_name: file.name,
            file_size: file.size,
            media_type: mediaType,
            status: "uploading",
          },
        ])
        .select()
        .single()

      progressData = progressDataResponse

      // Simular progresso de upload
      await simulateUploadProgress(file)

      // Gerar um nome de arquivo único
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const bucketName = mediaType === "image" ? "images" : "videos"
      const filePath = `${directoryId}/${fileName}`

      // Fazer upload do arquivo para o Supabase Storage
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file)

      if (uploadError) throw uploadError

      // Obter a URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(filePath)

      // Preparar dados para inserção
      const mediaData = {
        title: title || file.name,
        description,
        directory_id: directoryId,
        storage_path: filePath,
        url: publicUrl,
        size: file.size,
        type: file.type,
      }


      // Salvar os metadados no banco de dados
      const tableName = mediaType === "image" ? "images" : "videos"
      const { data, error: dbError } = await supabase.from(tableName).insert([mediaData]).select().single()

      if (dbError) throw dbError

      // Atualizar status do upload para concluído
      await supabase
        .from("upload_progress")
        .update({
          status: "completed",
          progress_percentage: 100,
          uploaded_size: file.size,
        })
        .eq("id", progressData.id)

      // Limpar o formulário
      setFile(null)
      setTitle("")
      setDescription("")
      setUploadProgress(0)

      // Mostrar modal de sucesso
      setUploadedMedia(data)
      setShowSuccessModal(true)

      // Notificar o componente pai
      onMediaUploaded(data, mediaType)
    } catch (error) {
      setError(error.message)

      // Atualizar status do upload para falhou
      if (progressData?.id) {
        await supabase.from("upload_progress").update({ status: "failed" }).eq("id", progressData.id)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="media-uploader">
      <h3>Carregar Nova Mídia</h3>

      <div className="media-type-selector">
        <label>
          <input
            type="radio"
            value="image"
            checked={mediaType === "image"}
            onChange={(e) => setMediaType(e.target.value)}
            disabled={uploading}
          />
          Imagem
        </label>
        <label>
          <input
            type="radio"
            value="video"
            checked={mediaType === "video"}
            onChange={(e) => setMediaType(e.target.value)}
            disabled={uploading}
          />
          Vídeo
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      {uploading && (
        <UploadProgress progress={uploadProgress} fileName={file?.name} fileSize={file?.size} mediaType={mediaType} />
      )}

      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-group">
          <label htmlFor="file">Selecionar {mediaType === "image" ? "Imagem" : "Vídeo"}</label>
          <input
            id="file"
            type="file"
            accept={mediaType === "image" ? "image/*" : "video/*"}
            onChange={handleFileChange}
            disabled={uploading}
          />
          {file && (
            <div className="file-preview">
              <p>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="title">Título (opcional)</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Título do ${mediaType === "image" ? "imagem" : "vídeo"}`}
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Descrição (opcional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Descrição do ${mediaType === "image" ? "imagem" : "vídeo"}`}
            disabled={uploading}
          />
        </div>

        <button type="submit" className="upload-button" disabled={uploading || !file}>
          {uploading ? "Carregando..." : `Carregar ${mediaType === "image" ? "Imagem" : "Vídeo"}`}
        </button>
      </form>

      {showSuccessModal && uploadedMedia && (
        <UploadSuccessModal media={uploadedMedia} mediaType={mediaType} onClose={() => setShowSuccessModal(false)} />
      )}
    </div>
  )
}

export default MediaUploader
