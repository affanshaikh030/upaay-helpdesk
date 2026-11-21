import { useState } from 'react'
import axios from 'axios'
import { ATTEMPTS_DEFAULT_PAGE_SIZE } from '@helpdesk/core'
import { AttemptsTable } from '@/components/AttemptsTable'
import { DeleteKnowledgeDialog } from '@/components/DeleteKnowledgeDialog'
import { KnowledgeDialog } from '@/components/KnowledgeDialog'
import { KnowledgeTable } from '@/components/KnowledgeTable'
import { TicketsPagination } from '@/components/TicketsPagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useKnowledge, useKnowledgeAttempts, type KnowledgeArticle } from '@/hooks/use-knowledge'
import { useLanguage } from '@/i18n/use-language'

const isForbidden = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 403

function LoadingRows({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-5 w-1/5" />
          <Skeleton className="h-5 w-1/6" />
        </div>
      ))}
    </div>
  )
}

// Admin only (the route is behind AdminRoute, and the API answers 403 to anyone else): the articles the AI answers
// from, and below them what the AI did, or in shadow mode would have done, with each new ticket
export default function KnowledgePage() {
  const { t } = useLanguage()
  const { data: articles, error } = useKnowledge()

  const [dialogOpen, setDialogOpen] = useState(false)
  // Kept after the dialog closes so its title doesn't flip during the exit animation
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingArticle, setDeletingArticle] = useState<KnowledgeArticle>()

  const [attemptsPage, setAttemptsPage] = useState(1)
  const { data: attempts, error: attemptsError } = useKnowledgeAttempts(attemptsPage)

  function openDialog(article?: KnowledgeArticle) {
    setEditingArticle(article)
    setDialogOpen(true)
  }

  function confirmDelete(article: KnowledgeArticle) {
    setDeletingArticle(article)
    setDeleteOpen(true)
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>{t.knowledgeTitle}</h1>
          </CardTitle>
          <CardDescription>{articles ? t.articleCount(articles.length) : t.knowledgeSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Button onClick={() => openDialog()}>{t.newArticle}</Button>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{isForbidden(error) ? t.noAccess : t.articlesLoadFailed}</AlertDescription>
            </Alert>
          ) : !articles ? (
            <LoadingRows label={t.articlesLoading} />
          ) : articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noArticles}</p>
          ) : (
            <KnowledgeTable articles={articles} onEdit={openDialog} onDelete={confirmDelete} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h2>{t.attemptsTitle}</h2>
          </CardTitle>
          <CardDescription>{t.attemptsSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {attemptsError ? (
            <Alert variant="destructive">
              <AlertDescription>{isForbidden(attemptsError) ? t.noAccess : t.attemptsLoadFailed}</AlertDescription>
            </Alert>
          ) : !attempts ? (
            <LoadingRows label={t.attemptsLoading} />
          ) : attempts.attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noAttempts}</p>
          ) : (
            <>
              <AttemptsTable attempts={attempts.attempts} />
              <TicketsPagination
                page={attemptsPage}
                pageCount={Math.max(1, Math.ceil(attempts.total / ATTEMPTS_DEFAULT_PAGE_SIZE))}
                pageSize={ATTEMPTS_DEFAULT_PAGE_SIZE}
                total={attempts.total}
                onPageChange={setAttemptsPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <DeleteKnowledgeDialog open={deleteOpen} onOpenChange={setDeleteOpen} article={deletingArticle} />
      <KnowledgeDialog open={dialogOpen} onOpenChange={setDialogOpen} article={editingArticle} />
    </main>
  )
}
