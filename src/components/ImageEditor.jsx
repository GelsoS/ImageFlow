"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/ImageEditor.css"

function ImageEditor({ image, onClose, onImageUpdated }) {
  const [title, setTitle] = useState(image.title || "")
  const [description, setDescription] = useState(image.description || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("images")
        .update({
          title,
          description,
          updated_at: new Date(),
        })
        .eq("id", image.id)
        .select()
        .single()

      if (error) throw error

      onImageUpdated(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="image-editor-overlay">
      <div className="image-editor">
        <div className="editor-header">
          <h3>Editar Imagem</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="editor-content">
          <div className="image-preview">
            <img src={image.url || "/placeholder.svg"} alt={image.title || "Imagem"} />
          </div>

          <form onSubmit={handleSubmit} className="editor-form">
            <div className="form-group">
              <label htmlFor="title">Título</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da imagem"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descrição</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da imagem"
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

export default ImageEditor
