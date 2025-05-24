"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/MediaEditor.css"

function MediaEditor({ media, mediaType, onClose, onMediaUpdated }) {
  const [title, setTitle] = useState(media.title || "")
  const [description, setDescription] = useState(media.description || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      const tableName = mediaType === "images" ? "images" : "videos"
      const { data, error } = await supabase
        .from(tableName)
        .update({
          title,
          description,
          updated_at: new Date(),
        })
        .eq("id", media.id)
        .select()
        .single()

      if (error) throw error

      onMediaUpdated(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="media-editor-overlay">
      <div className="media-editor">
        <div className="editor-header">
          <h3>Editar {mediaType === "images" ? "Imagem" : "Vídeo"}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="editor-content">
          <div className="media-preview">
            {mediaType === "images" ? (
              <img src={media.url || "/placeholder.svg"} alt={media.title || "Mídia"} />
            ) : (
              <video controls>
                <source src={media.url} type={media.type} />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            )}
          </div>

          <form onSubmit={handleSubmit} className="editor-form">
            <div className="form-group">
              <label htmlFor="title">Título</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Título d${mediaType === "images" ? "a imagem" : "o vídeo"}`}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descrição</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Descrição d${mediaType === "images" ? "a imagem" : "o vídeo"}`}
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} disabled={loading} className="cancel-btn">
                Cancelar
              </button>

              <button type="submit" disabled={loading} className="save-btn">
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default MediaEditor
