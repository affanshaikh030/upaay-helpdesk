import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { KnowledgeArticle } from '@/hooks/use-knowledge'
import { useLanguage } from '@/i18n/use-language'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function KnowledgeTable({
  articles,
  onEdit,
  onDelete,
}: {
  articles: KnowledgeArticle[]
  onEdit: (article: KnowledgeArticle) => void
  onDelete: (article: KnowledgeArticle) => void
}) {
  const { t } = useLanguage()
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.columnTitle}</TableHead>
          <TableHead>{t.columnLanguage}</TableHead>
          <TableHead>{t.columnUpdated}</TableHead>
          <TableHead className="w-24">
            <span className="sr-only">{t.columnActions}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {articles.map((article) => (
          <TableRow key={article.id}>
            <TableCell className="max-w-xs truncate font-medium" title={article.title}>
              {article.title}
            </TableCell>
            <TableCell>
              {article.language ? (
                t.articleLanguages[article.language]
              ) : (
                <span className="text-muted-foreground">{t.notSet}</span>
              )}
            </TableCell>
            <TableCell>{dateFormat.format(new Date(article.updatedAt))}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.editArticleLabel(article.title)}
                onClick={() => onEdit(article)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.deleteArticleLabel(article.title)}
                onClick={() => onDelete(article)}
              >
                <Trash2 />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
