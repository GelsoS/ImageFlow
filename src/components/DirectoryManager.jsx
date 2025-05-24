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
  const [expandedDirectories, setExpandedDirectories] = useState(new Set())

  async function handleCreateDirectory(e) {
    e.preventDefault()

    if (!newDirectoryName.trim()) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("directories")
        .insert([
          {
            name: newDirectoryName.trim(),
            parent_id: currentDirectory?.id || null,
          },
        ])
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
    if (
      !confirm(
        "Tem certeza que deseja excluir este diretório? Todas as imagens, vídeos e subdiretórios associados serão excluídos.",
      )
    ) {
      return
    }

    try {
      setLoading(true)

      // Função recursiva para excluir diretórios e seus conteúdos
      async function deleteDirectoryRecursive(dirId) {
        // Buscar subdiretórios
        const { data: subdirs } = await supabase.from("directories").select("id").eq("parent_id", dirId)

        // Excluir subdiretórios recursivamente
        if (subdirs && subdirs.length > 0) {
          for (const subdir of subdirs) {
            await deleteDirectoryRecursive(subdir.id)
          }
        }

        // Excluir imagens do diretório
        const { data: images } = await supabase.from("images").select("id, storage_path").eq("directory_id", dirId)

        if (images && images.length > 0) {
          for (const image of images) {
            await supabase.storage.from("images").remove([image.storage_path])
          }
          await supabase.from("images").delete().eq("directory_id", dirId)
        }

        // Excluir vídeos do diretório
        const { data: videos } = await supabase.from("videos").select("id, storage_path").eq("directory_id", dirId)

        if (videos && videos.length > 0) {
          for (const video of videos) {
            await supabase.storage.from("videos").remove([video.storage_path])
          }
          await supabase.from("videos").delete().eq("directory_id", dirId)
        }

        // Excluir o diretório
        await supabase.from("directories").delete().eq("id", dirId)
      }

      await deleteDirectoryRecursive(id)
      onDirectoryDeleted(id)
    } catch (error) {
      console.error("Erro ao excluir diretório:", error.message)
      alert("Erro ao excluir diretório: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleDirectory(dirId) {
    const newExpanded = new Set(expandedDirectories)
    if (newExpanded.has(dirId)) {
      newExpanded.delete(dirId)
    } else {
      newExpanded.add(dirId)
    }
    setExpandedDirectories(newExpanded)
  }

  function buildDirectoryTree(dirs, parentId = null) {
    return dirs
      .filter((dir) => dir.parent_id === parentId)
      .map((dir) => ({
        ...dir,
        children: buildDirectoryTree(dirs, dir.id),
      }))
  }

  function renderDirectoryTree(tree, level = 0) {
    return tree.map((dir) => (
      <div key={dir.id} className="directory-tree-item">
        <div className="directory-item-container" style={{ marginLeft: `${level * 20}px` }}>
          <div className="directory-item-content">
            {dir.children.length > 0 && (
              <button className="expand-btn" onClick={() => toggleDirectory(dir.id)}>
                {expandedDirectories.has(dir.id) ? "▼" : "▶"}
              </button>
            )}
            <div
              className={`directory-item ${currentDirectory?.id === dir.id ? "active" : ""}`}
              onClick={() => setCurrentDirectory(dir)}
            >
              📁 {dir.name}
            </div>
          </div>
          <button className="delete-directory-btn" onClick={() => handleDeleteDirectory(dir.id)} disabled={loading}>
            ×
          </button>
        </div>
        {expandedDirectories.has(dir.id) && dir.children.length > 0 && (
          <div className="directory-children">{renderDirectoryTree(dir.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  const directoryTree = buildDirectoryTree(directories)

  return (
    <div className="directory-manager">
      <h3>Diretórios</h3>

      <form onSubmit={handleCreateDirectory} className="directory-form">
        <input
          type="text"
          value={newDirectoryName}
          onChange={(e) => setNewDirectoryName(e.target.value)}
          placeholder={currentDirectory ? `Novo subdiretório em ${currentDirectory.name}` : "Nome do novo diretório"}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newDirectoryName.trim()}>
          {loading ? "..." : "Criar"}
        </button>
      </form>

      {currentDirectory && (
        <div className="current-directory-info">
          <small>Criando em: {currentDirectory.name}</small>
          <button className="clear-selection-btn" onClick={() => setCurrentDirectory(null)}>
            Limpar seleção
          </button>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      <div className="directory-list">
        {directoryTree.length > 0 ? (
          renderDirectoryTree(directoryTree)
        ) : (
          <p className="no-directories">Nenhum diretório criado</p>
        )}
      </div>
    </div>
  )
}

export default DirectoryManager
