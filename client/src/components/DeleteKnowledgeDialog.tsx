import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDeleteKnowledgeArticle, type KnowledgeArticle } from '@/hooks/use-knowledge'
import { useLanguage } from '@/i18n/use-language'

function DeleteArticleConfirm({ article, onDone }: { article: KnowledgeArticle; onDone: () => void }) {
  const [error, setError] = useState(false)
  const deleteArticle = useDeleteKnowledgeArticle()
  const { t } = useLanguage()

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.deleteArticle}</DialogTitle>
        <DialogDescription>{t.deleteArticleConfirm(article.title)}</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t.deleteFailed}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t.cancel}</DialogClose>
        <Button
          type="button"
          variant="destructive"
          disabled={deleteArticle.isPending}
          onClick={() => {
            setError(false)
            deleteArticle.mutate(article.id, { onSuccess: onDone, onError: () => setError(true) })
          }}
        >
          {deleteArticle.isPending ? t.deleting : t.deleteButton}
        </Button>
      </DialogFooter>
    </>
  )
}

// Confirmation before deleting `article`
export function DeleteKnowledgeDialog({
  open,
  onOpenChange,
  article,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  article?: KnowledgeArticle
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Unmounts on close, so the error state resets each time */}
        {article && <DeleteArticleConfirm key={article.id} article={article} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
