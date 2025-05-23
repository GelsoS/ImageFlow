"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import ImageEditor from "./ImageEditor"
import "../styles/ImageGallery.css"

function ImageGallery({ images, isAdmin, onImageDeleted }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDownload(image) {
    try {
      setLoading(true)

      // Obter o URL da imagem
      const { data, error } = await supabase.storage.from("images").download(image.storage_path)

      if (error) throw error

      // Criar um URL de objeto para o arquivo
      const url = URL.createObjectURL(data)

      // Criar um elemento de link para iniciar o download
      const a = document.createElement("a")
      a.href = url
      a.download = image.title || "download"
      document.body.appendChild(a)
      a.click()

      // Limpar
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Erro ao baixar imagem:", error.message)
      alert("Erro ao baixar imagem: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(image) {
    if (!confirm("Tem certeza que deseja excluir esta imagem?")) {
      return
    }

    try {
      setLoading(true)

      // Excluir o arquivo do storage
      const { error: storageError } = await supabase.storage.from("images").remove([image.storage_path])

      if (storageError) throw storageError

      // Excluir o registro do banco de dados
      const { error: dbError } = await supabase.from("images").delete().eq("id", image.id)

      if (dbError) throw dbError

      // Notificar o componente pai
      onImageDeleted(image.id)
    } catch (error) {
      console.error("Erro ao excluir imagem:", error.message)
      alert("Erro ao excluir imagem: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(image) {
    setSelectedImage(image)
    setIsEditing(true)
  }

  function handleCloseEditor() {
    setIsEditing(false)
    setSelectedImage(null)
  }

  function handleImageUpdated(updatedImage) {
    // Atualizar a imagem na lista
    const updatedImages = images.map((img) => (img.id === updatedImage.id ? updatedImage : img))

    // Fechar o editor
    handleCloseEditor()
  }

  if (images.length === 0) {
    return <div className="no-images">Nenhuma imagem encontrada neste diretório</div>
  }

  return (
    <div className="image-gallery">
      {isEditing && selectedImage && (
        <ImageEditor image={selectedImage} onClose={handleCloseEditor} onImageUpdated={handleImageUpdated} />
      )}

      <div className="gallery-grid">
        {images.map((image) => (
          <div key={image.id} className="image-card">
            <div className="image-container">
              <img src={image.url || "/placeholder.svg"} alt={image.title || "Imagem"} />
            </div>

            <div className="image-info">
              <h4>{image.title || "Sem título"}</h4>
              {image.description && <p>{image.description}</p>}
            </div>

            <div className="image-actions">
              <button onClick={() => handleDownload(image)} disabled={loading} className="download-btn">
                Baixar
              </button>

              {isAdmin && (
                <>
                  <button onClick={() => handleEdit(image)} disabled={loading} className="edit-btn">
                    Editar
                  </button>

                  <button onClick={() => handleDelete(image)} disabled={loading} className="delete-btn">
                    Excluir
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ImageGallery
