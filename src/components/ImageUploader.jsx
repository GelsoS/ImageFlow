"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/ImageUploader.css"

function ImageUploader({ directoryId, onImageUploaded }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  function handleFileChange(e) {
    const selectedFile = e.target.files[0]

    if (selectedFile) {
      // Verificar se é uma imagem
      if (!selectedFile.type.startsWith("image/")) {
        setError("Por favor, selecione apenas arquivos de imagem.")
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
      setError("Por favor, selecione uma imagem para upload.")
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Gerar um nome de arquivo único
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${directoryId}/${fileName}`

      // Fazer upload do arquivo para o Supabase Storage
      const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file)

      if (uploadError) throw uploadError

      // Obter a URL pública da imagem
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath)

      // Salvar os metadados da imagem no banco de dados
      const { data, error: dbError } = await supabase
        .from("images")
        .insert([
          {
            title: title || file.name,
            description,
            directory_id: directoryId,
            storage_path: filePath,
            url: publicUrl,
            size: file.size,
            type: file.type,
          },
        ])
        .select()
        .single()

      if (dbError) throw dbError

      // Limpar o formulário
      setFile(null)
      setTitle("")
      setDescription("")

      // Notificar o componente pai
      onImageUploaded(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="image-uploader">
      <h3>Carregar Nova Imagem</h3>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-group">
          <label htmlFor="file">Selecionar Imagem</label>
          <input id="file" type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          {file && (
            <div className="file-preview">
              <p>
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
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
            placeholder="Título da imagem"
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Descrição (opcional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição da imagem"
            disabled={uploading}
          />
        </div>

        <button type="submit" className="upload-button" disabled={uploading || !file}>
          {uploading ? "Carregando..." : "Carregar Imagem"}
        </button>
      </form>
    </div>
  )
}

export default ImageUploader
