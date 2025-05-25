"use client"

import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import MediaGallery from "./MediaGallery"
import "../styles/Dashboard.css"

function UserDashboard({ user }) {
  const [directories, setDirectories] = useState([])
  const [currentDirectory, setCurrentDirectory] = useState(null)
  const [images, setImages] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("images")
  const [expandedDirectories, setExpandedDirectories] = useState(new Set())

  useEffect(() => {
    fetchDirectories()
  }, [])

  useEffect(() => {
    if (currentDirectory) {
      fetchImages(currentDirectory.id)
      fetchVideos(currentDirectory.id)
    } else {
      setImages([])
      setVideos([])
    }
  }, [currentDirectory])

  async function fetchDirectories() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("directories").select("*").order("name")

      if (error) {
        throw error
      }

      setDirectories(data || [])
    } catch (error) {
      console.error("Erro ao buscar diretórios:", error.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchImages(directoryId) {
    try {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("directory_id", directoryId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setImages(data || [])
    } catch (error) {
      console.error("Erro ao buscar imagens:", error.message)
    }
  }

  async function fetchVideos(directoryId) {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("directory_id", directoryId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setVideos(data || [])
    } catch (error) {
      console.error("Erro ao buscar vídeos:", error.message)
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
        {expandedDirectories.has(dir.id) && dir.children.length > 0 && (
          <div className="directory-children">{renderDirectoryTree(dir.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  const directoryTree = buildDirectoryTree(directories)

  return (
    <div className="dashboard-layout">
      <div className="dashboard-sidebar">
        <h3>Diretórios</h3>
        <div className="directory-list">
          {directoryTree.length > 0 ? (
            renderDirectoryTree(directoryTree)
          ) : (
            <p className="no-directories">Nenhum diretório disponível</p>
          )}
        </div>
      </div>

      <div className="dashboard-main-content">
        {currentDirectory ? (
          <>
            <div className="content-header">
              <h2>Diretório: {currentDirectory.name}</h2>
            </div>

            <div className="media-tabs">
              <button
                className={`tab-btn ${activeTab === "images" ? "active" : ""}`}
                onClick={() => setActiveTab("images")}
              >
                Imagens ({images.length})
              </button>
              <button
                className={`tab-btn ${activeTab === "videos" ? "active" : ""}`}
                onClick={() => setActiveTab("videos")}
              >
                Vídeos ({videos.length})
              </button>
            </div>

            <div className="media-content">
              <MediaGallery
                media={activeTab === "images" ? images : videos}
                mediaType={activeTab}
                isAdmin={false}
                userId={user.id}
              />
            </div>
          </>
        ) : (
          <div className="select-directory-message">
            <h2>Selecione um diretório para visualizar mídias</h2>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserDashboard
