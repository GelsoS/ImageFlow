"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/MediaUploader.css"

function MediaUploader({ directoryId, onMediaUploaded }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [mediaType, setMediaType] = useState("image")

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

  async function handleUpload(e) {
    e.preventDefault()

    if (!file) {
      setError(`Por favor, selecione um${mediaType === "image" ? "a imagem" : " vídeo"} para upload.`)
      return
    }

    try {
      setUploading(true)
      setError(null)

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

      // Adicionar duração para vídeos (simulada - em produção você usaria uma biblioteca para extrair metadados)
      if (mediaType === "video") {
        mediaData.duration = 0 // Placeholder - implementar extração real de duração
      }

      // Salvar os metadados no banco de dados
      const tableName = mediaType === "image" ? "images" : "videos"
      const { data, error: dbError } = await supabase.from(tableName).insert([mediaData]).select().single()

      if (dbError) throw dbError

      // Limpar o formulário
      setFile(null)
      setTitle("")
      setDescription("")

      // Notificar o componente pai
      onMediaUploaded(data, mediaType)
    } catch (error) {
      setError(error.message)
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
    </div>
  )
}

export default MediaUploader
