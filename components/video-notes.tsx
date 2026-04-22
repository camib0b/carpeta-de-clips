'use client'

import { useState } from 'react'
import { VideoNote } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, User, Send } from 'lucide-react'

interface VideoNotesProps {
  videoId: string
  initialNotes: VideoNote[]
  onAddNote: (note: { content: string; authorName?: string }) => void
}

/**
 * Notes/comments section for a video
 * Allows anonymous or named comments
 * Future: will integrate with user authentication
 */
export function VideoNotes({ videoId, initialNotes, onAddNote }: VideoNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [showNameField, setShowNameField] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setIsSubmitting(true)

    // Create new note
    const note: VideoNote = {
      id: `note-${Date.now()}`,
      videoId,
      content: newNote.trim(),
      authorName: authorName.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    // Add to local state (optimistic update)
    setNotes((prev) => [note, ...prev])
    
    // Call parent handler for persistence
    onAddNote({ content: note.content, authorName: note.authorName })

    // Reset form
    setNewNote('')
    setAuthorName('')
    setShowNameField(false)
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          Notas ({notes.length})
        </h3>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Escribe una nota sobre este video..."
          className="min-h-[80px] resize-none border-border bg-background text-sm"
          aria-label="Nueva nota"
        />
        
        {/* Optional name field */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {showNameField ? (
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                className="h-9 w-[200px] border-border text-sm"
                aria-label="Nombre del autor"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowNameField(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span>Agregar nombre</span>
              </button>
            )}
          </div>
          
          <Button
            type="submit"
            disabled={!newNote.trim() || isSubmitting}
            size="sm"
            className="gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Enviar Nota</span>
          </Button>
        </div>
      </form>

      {/* Notes List */}
      {notes.length > 0 ? (
        <ul className="space-y-4 divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id} className="pt-4 first:pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-foreground">
                    {note.authorName || 'Anonimo'}
                  </span>
                  <time className="text-xs text-muted-foreground">
                    {format(new Date(note.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                  </time>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {note.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay notas todavia. Se el primero en agregar una.
        </p>
      )}
    </div>
  )
}
