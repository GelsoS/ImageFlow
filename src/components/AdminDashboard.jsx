"use client"

import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import DirectoryManager from "./DirectoryManager"
import ImageUploader from "./ImageUploader"
import ImageGallery from "./ImageGallery"
import "../styles/Dashboard.css"

function AdminDashboard({ user }) {
  const [directories, setDirectories] = useState([])
  const [currentDirectory, setCurrentDirectory] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDirectories()
  }, [])

  useEffect(() => {
    if (currentDirectory) {
      fetchImages(currentDirectory.id)
    } else {
      setImages([])
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
      setLoading(true)
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
    } finally {
      setLoading(false)
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

  async function handleImageUploaded(newImage) {
    setImages([newImage, ...images])
  }

  async function handleImageDeleted(id) {
    setImages(images.filter((img) => img.id !== id))
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-sidebar">
        <DirectoryManager
          directories={directories}
          currentDirectory={currentDirectory}
          setCurrentDirectory={setCurrentDirectory}
          onDirectoryCreated={handleDirectoryCreated}
          onDirectoryDeleted={handleDirectoryDeleted}
        />
      </div>

      <div className="dashboard-content">
        {currentDirectory ? (
          <>
            <h2>Diretório: {currentDirectory.name}</h2>
            <ImageUploader directoryId={currentDirectory.id} onImageUploaded={handleImageUploaded} />
            <ImageGallery images={images} isAdmin={true} onImageDeleted={handleImageDeleted} />
          </>
        ) : (
          <div className="select-directory-message">
            <h2>Selecione ou crie um diretório para gerenciar imagens</h2>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
