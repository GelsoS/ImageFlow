"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/DirectoryManager.css"

function DirectoryManager({
  directories,
  currentDirectory,
  setCurrentDirectory,
  onDirectoryCreated,
  onDirectoryDeleted,
}) {
  const [newDirectoryName, setNewDirectoryName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreateDirectory(e) {
    e.preventDefault()

    if (!newDirectoryName.trim()) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("directories")
        .insert([{ name: newDirectoryName.trim() }])
        .select()
        .single()

      if (error) throw error

      onDirectoryCreated(data)
      setNewDirectoryName("")
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDirectory(id) {
    if (!confirm("Tem certeza que deseja excluir este diretório? Todas as imagens associadas serão excluídas.")) {
      return
    }

    try {
      setLoading(true)

      // Primeiro, excluir todas as imagens associadas ao diretório
      const { data: images } = await supabase.from("images").select("id, storage_path").eq("directory_id", id)

      // Excluir arquivos do storage
      if (images && images.length > 0) {
        for (const image of images) {
          await supabase.storage.from("images").remove([image.storage_path])
        }

        // Excluir registros de imagens do banco de dados
        await supabase.from("images").delete().eq("directory_id", id)
      }

      // Finalmente, excluir o diretório
      const { error } = await supabase.from("directories").delete().eq("id", id)

      if (error) throw error

      onDirectoryDeleted(id)
    } catch (error) {
      console.error("Erro ao excluir diretório:", error.message)
      alert("Erro ao excluir diretório: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="directory-manager">
      <h3>Diretórios</h3>

      <form onSubmit={handleCreateDirectory} className="directory-form">
        <input
          type="text"
          value={newDirectoryName}
          onChange={(e) => setNewDirectoryName(e.target.value)}
          placeholder="Nome do novo diretório"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newDirectoryName.trim()}>
          {loading ? "..." : "Criar"}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      <div className="directory-list">
        {directories.map((dir) => (
          <div key={dir.id} className="directory-item-container">
            <div
              className={`directory-item ${currentDirectory?.id === dir.id ? "active" : ""}`}
              onClick={() => setCurrentDirectory(dir)}
            >
              {dir.name}
            </div>
            <button className="delete-directory-btn" onClick={() => handleDeleteDirectory(dir.id)} disabled={loading}>
              ×
            </button>
          </div>
        ))}

        {directories.length === 0 && <p className="no-directories">Nenhum diretório criado</p>}
      </div>
    </div>
  )
}

export default DirectoryManager
