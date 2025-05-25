"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import MediaEditor from "./MediaEditor"
import "../styles/MediaGallery.css"

function MediaGallery({ media, mediaType, isAdmin, onMediaDeleted, userId }) {
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDownload(mediaItem) {
    try {
      setLoading(true)

      const bucketName = mediaType === "images" ? "images" : "videos"

      // Obter o arquivo
      const { data, error } = await supabase.storage.from(bucketName).download(mediaItem.storage_path)

      if (error) throw error

      // Atualizar lista de downloads
      const downloadedBy = mediaItem.downloaded_by || []
      if (!downloadedBy.includes(userId)) {
        downloadedBy.push(userId)

        const tableName = mediaType === "images" ? "images" : "videos"
        await supabase.from(tableName).update({ downloaded_by: downloadedBy }).eq("id", mediaItem.id)
      }

      // Criar um URL de objeto para o arquivo
      const url = URL.createObjectURL(data)

      // Criar um elemento de link para iniciar o download
      const a = document.createElement("a")
      a.href = url
      a.download = mediaItem.title || "download"
      document.body.appendChild(a)
      a.click()

      // Limpar
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Erro ao baixar mídia:", error.message)
      alert("Erro ao baixar mídia: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsUsed(mediaItem) {
    try {
      setLoading(true)

      const tableName = mediaType === "images" ? "images" : "videos"
      const { error } = await supabase
        .from(tableName)
        .update({ marked_as_used: !mediaItem.marked_as_used })
        .eq("id", mediaItem.id)

      if (error) throw error

      // Atualizar o estado local
      const updatedMedia = media.map((item) =>
        item.id === mediaItem.id ? { ...item, marked_as_used: !item.marked_as_used } : item,
      )

      // Forçar re-render
      window.location.reload()
    } catch (error) {
      console.error("Erro ao marcar como usado:", error.message)
      alert("Erro ao marcar como usado: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(mediaItem) {
    if (!confirm(`Tem certeza que deseja excluir est${mediaType === "images" ? "a imagem" : "e vídeo"}?`)) {
      return
    }

    try {
      setLoading(true)

      const bucketName = mediaType === "images" ? "images" : "videos"
      const tableName = mediaType === "images" ? "images" : "videos"

      console.log("Iniciando exclusão:", {
        mediaItem: mediaItem.id,
        bucketName,
        tableName,
        storagePath: mediaItem.storage_path,
      })

      // 1. Primeiro excluir o arquivo do storage
      console.log(bucketName,'---',mediaItem.storage_path);
      
      const { error: storageError } = await supabase.storage.from(bucketName).remove([mediaItem.storage_path])

      if (storageError) {
        console.error("Erro ao excluir do storage:", storageError)
        // Continuar mesmo se houver erro no storage (arquivo pode não existir)
      }

      // 2. Depois excluir o registro do banco de dados
      console.log(tableName,'---',mediaItem.id);
      
      const { error: dbError } = await supabase.from(tableName).delete().eq("id", mediaItem.id)

      if (dbError) {
        console.error("Erro ao excluir do banco:", dbError)
        throw dbError
      }

      console.log("Exclusão bem-sucedida")

      // 3. Notificar o componente pai para atualizar a lista
      if (onMediaDeleted) {
        onMediaDeleted(mediaItem.id, mediaType.slice(0, -1)) // Remove 's' do final
      }

      // 4. Forçar atualização da página como fallback
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("Erro ao excluir mídia:", error.message)
      alert("Erro ao excluir mídia: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(mediaItem) {
    setSelectedMedia(mediaItem)
    setIsEditing(true)
  }

  function handleCloseEditor() {
    setIsEditing(false)
    setSelectedMedia(null)
  }

  function handleMediaUpdated(updatedMedia) {
    handleCloseEditor()
    // Forçar re-render
    window.location.reload()
  }

  if (media.length === 0) {
    return (
      <div className="no-media">
        Nenhum{mediaType === "images" ? "a imagem" : " vídeo"} encontrad{mediaType === "images" ? "a" : "o"} neste
        diretório
      </div>
    )
  }

  return (
    <div className="media-gallery">
      {isEditing && selectedMedia && (
        <MediaEditor
          media={selectedMedia}
          mediaType={mediaType}
          onClose={handleCloseEditor}
          onMediaUpdated={handleMediaUpdated}
        />
      )}

      <div className="gallery-grid">
        {media.map((mediaItem) => {
          const hasDownloaded = mediaItem.downloaded_by?.includes(userId)
          const isMarkedAsUsed = mediaItem.marked_as_used

          return (
            <div key={mediaItem.id} className={`media-card ${isMarkedAsUsed ? "marked-as-used" : ""}`}>
              <div className="media-container">
                {mediaType === "images" ? (
                  <img src={mediaItem.url || "/placeholder.svg"} alt={mediaItem.title || "Imagem"} />
                ) : (
                  <video controls>
                    <source src={mediaItem.url} type={mediaItem.type} />
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                )}

                {hasDownloaded && <div className="download-badge">✓ Baixado</div>}

                {isMarkedAsUsed && <div className="used-badge">✓ Usado</div>}
              </div>

              <div className="media-info">
                <h4>{mediaItem.title || "Sem título"}</h4>
                {mediaItem.description && <p>{mediaItem.description}</p>}
                {mediaType === "videos" && mediaItem.duration && (
                  <small>
                    Duração: {Math.floor(mediaItem.duration / 60)}:
                    {(mediaItem.duration % 60).toString().padStart(2, "0")}
                  </small>
                )}
              </div>

              <div className="media-actions">
                <button onClick={() => handleDownload(mediaItem)} disabled={loading} className="download-btn">
                  Baixar
                </button>

                <button
                  onClick={() => handleMarkAsUsed(mediaItem)}
                  disabled={loading}
                  className={`mark-used-btn ${isMarkedAsUsed ? "marked" : ""}`}
                >
                  {isMarkedAsUsed ? "Desmarcar" : "Marcar como usado"}
                </button>

                {isAdmin && (
                  <>
                    <button onClick={() => handleEdit(mediaItem)} disabled={loading} className="edit-btn">
                      Editar
                    </button>

                    <button onClick={() => handleDelete(mediaItem)} disabled={loading} className="delete-btn">
                      {loading ? "Excluindo..." : "Excluir"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MediaGallery
