import { KnowledgeForm } from '@/components/KnowledgeForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { KnowledgeArticle } from '@/hooks/use-knowledge'
import { useLanguage } from '@/i18n/use-language'

// Create an article, or edit `article` when given
export function KnowledgeDialog({
  open,
  onOpenChange,
  article,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  article?: KnowledgeArticle
}) {
  const { t } = useLanguage()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{article ? t.editArticle : t.newArticle}</DialogTitle>
          <DialogDescription>{article ? t.editArticleDescription : t.newArticleDescription}</DialogDescription>
        </DialogHeader>
        {/* Unmounts on close, so the form resets each time the dialog opens */}
        <KnowledgeForm key={article?.id} article={article} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
