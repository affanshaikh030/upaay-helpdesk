import { useState, type FormEvent } from 'react'
import axios from 'axios'
import {
  createKnowledgeArticleSchema,
  KNOWLEDGE_CONTENT_MAX,
  KNOWLEDGE_TITLE_MAX,
  KnowledgeLanguage,
} from '@helpdesk/core'
import { SelectField } from '@/components/SelectField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateKnowledgeArticle, useUpdateKnowledgeArticle, type KnowledgeArticle } from '@/hooks/use-knowledge'
import { useLanguage } from '@/i18n/use-language'

type FieldName = 'title' | 'content'
type FieldErrors = Partial<Record<FieldName, string>>

// Creates an article, or edits `article` when given. Must render inside a Dialog: Cancel is a DialogClose
export function KnowledgeForm({ article, onDone }: { article?: KnowledgeArticle; onDone: () => void }) {
  const isEdit = article !== undefined
  const { t } = useLanguage()
  const [values, setValues] = useState({
    title: article?.title ?? '',
    content: article?.content ?? '',
    language: article?.language ?? '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const create = useCreateKnowledgeArticle()
  const update = useUpdateKnowledgeArticle(article?.id ?? 0)
  const isPending = isEdit ? update.isPending : create.isPending

  // The shared schema decides what is valid; its English messages are replaced by the translated ones
  function messageFor(name: FieldName, issueCode: string): string {
    const tooBig = issueCode === 'too_big'
    if (name === 'title') return tooBig ? t.titleTooLong(KNOWLEDGE_TITLE_MAX) : t.titleRequired
    return tooBig ? t.contentTooLong(KNOWLEDGE_CONTENT_MAX) : t.contentRequired
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(undefined)
    const parsed = createKnowledgeArticleSchema.safeParse({ ...values, language: values.language || null })
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const name = issue.path[0]
        if ((name === 'title' || name === 'content') && !next[name]) next[name] = messageFor(name, issue.code)
      }
      setErrors(next)
      return
    }
    setErrors({})
    const options = {
      onSuccess: onDone,
      onError: (error: Error) => {
        const serverErrors = axios.isAxiosError(error)
          ? (error.response?.data?.fieldErrors as Partial<Record<string, string[]>> | undefined)
          : undefined
        if (serverErrors?.title || serverErrors?.content) {
          setErrors({
            title: serverErrors.title && t.titleRequired,
            content: serverErrors.content && t.contentRequired,
          })
        } else {
          setFormError(isEdit ? t.saveFailed : t.createFailed)
        }
      },
    }
    if (isEdit) {
      update.mutate(parsed.data, options)
    } else {
      create.mutate(parsed.data, options)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="knowledge-title">{t.fieldTitle}</Label>
        <Input
          id="knowledge-title"
          autoComplete="off"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'knowledge-title-error' : undefined}
        />
        {errors.title && (
          <p id="knowledge-title-error" className="text-sm text-destructive">
            {errors.title}
          </p>
        )}
      </div>
      <SelectField
        id="knowledge-language"
        label={t.fieldLanguage}
        value={values.language}
        onChange={(e) => setValues((v) => ({ ...v, language: e.target.value as KnowledgeLanguage | '' }))}
      >
        <option value="">{t.notSet}</option>
        {Object.values(KnowledgeLanguage).map((language) => (
          <option key={language} value={language}>
            {t.articleLanguages[language]}
          </option>
        ))}
      </SelectField>
      <div className="space-y-1.5">
        <Label htmlFor="knowledge-content">{t.fieldContent}</Label>
        <Textarea
          id="knowledge-content"
          rows={10}
          value={values.content}
          onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={['knowledge-content-count', errors.content && 'knowledge-content-error'].filter(Boolean).join(' ')}
        />
        <p id="knowledge-content-count" className="text-sm text-muted-foreground">
          {t.contentCount(values.content.length, KNOWLEDGE_CONTENT_MAX)}
        </p>
        {errors.content && (
          <p id="knowledge-content-error" className="text-sm text-destructive">
            {errors.content}
          </p>
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t.cancel}</DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEdit ? t.saving : t.creating) : isEdit ? t.saveChanges : t.createArticleButton}
        </Button>
      </DialogFooter>
    </form>
  )
}
