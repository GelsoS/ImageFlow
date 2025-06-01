"use client"

import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import DirectoryManager from "./DirectoryManager"
import MediaUploader from "./MediaUploader"
import MediaGallery from "./MediaGallery"
import AdminDebugPanel from "./AdminDebugPanel"
import { useDebugPanel } from "../../context/DebugPanelContext"
import "../styles/Dashboard.css"

function AdminDashboard({ user }) {
  const [directories, setDirectories] = useState([])
  const [currentDirectory, setCurrentDirectory] = useState(null)
  const [images, setImages] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("images")
  const { showDebugPanel } = useDebugPanel();

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

  async function handleDirectoryCreated(newDirectory) {
    setDirectories([...directories, newDirectory])
  }

  async function handleDirectoryDeleted(id) {
    setDirectories(directories.filter((dir) => dir.id !== id))
    if (currentDirectory && currentDirectory.id === id) {
      setCurrentDirectory(null)
    }
  }

  async function handleMediaUploaded(newMedia, type) {
    if (type === "image") {
      setImages([newMedia, ...images])
    } else if (type === "video") {
      setVideos([newMedia, ...videos])
    }
  }

  async function handleMediaDeleted(id, type) {
    console.log("handleMediaDeleted chamado:", { id, type })

    if (type === "image") {
      setImages((prevImages) => {
        const newImages = prevImages.filter((img) => img.id !== id)
        console.log("Imagens atualizadas:", newImages.length)
        return newImages
      })
    } else if (type === "video") {
      setVideos((prevVideos) => {
        const newVideos = prevVideos.filter((vid) => vid.id !== id)
        console.log("Vídeos atualizados:", newVideos.length)
        return newVideos
      })
    }

    // Recarregar dados para garantir sincronização
    if (currentDirectory) {
      setTimeout(() => {
        fetchImages(currentDirectory.id)
        fetchVideos(currentDirectory.id)
      }, 1000)
    }
  }

  return (
    <div className="dashboard-layout">
      <div className="dashboard-sidebar">
        <DirectoryManager
          directories={directories}
          currentDirectory={currentDirectory}
          setCurrentDirectory={setCurrentDirectory}
          onDirectoryCreated={handleDirectoryCreated}
          onDirectoryDeleted={handleDirectoryDeleted}
        />
      </div>

      <div className="dashboard-main-content">
        {/* Debug Panel */}
        {showDebugPanel && <AdminDebugPanel user={user} />}

        {currentDirectory ? (
          <>
            <div className="content-header">
              <h2>Diretório: {currentDirectory.name}</h2>
            </div>

            <div className="admin-content-wrapper">
              <div className="uploader-section">
                <MediaUploader
                  directoryId={currentDirectory.id}
                  onMediaUploaded={handleMediaUploaded}
                  userId={user.id}
                />
              </div>

              <div className="media-section">
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
                    isAdmin={true}
                    onMediaDeleted={handleMediaDeleted}
                    userId={user.id}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="select-directory-message">
            <h2>Selecione ou crie um diretório para gerenciar mídias</h2>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
