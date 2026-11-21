import axios from 'axios'
import {
  ATTEMPTS_DEFAULT_PAGE_SIZE,
  type AutoResolveDecision,
  type AutoResolveReason,
  type CreateKnowledgeArticleInput,
  type KnowledgeLanguage,
  type UpdateKnowledgeArticleInput,
} from '@helpdesk/core'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type KnowledgeArticle = {
  id: number
  title: string
  content: string
  language: KnowledgeLanguage | null
  createdAt: string
  updatedAt: string
}

// What the auto-resolve job did (or, in shadow mode, would have done) for one ticket. A cited article's title is null once it was deleted
export type KnowledgeAttempt = {
  id: number
  ticketId: number
  ticketSubject: string
  decision: AutoResolveDecision
  reason: AutoResolveReason
  topRank: number | null
  confidence: number | null
  draftReply: string | null
  citedArticles: { id: number; title: string | null }[]
  shadow: boolean
  acted: boolean
  createdAt: string
}

export type KnowledgeAttemptPage = { attempts: KnowledgeAttempt[]; total: number }

// The articles and the attempts share this prefix, so changing an article refreshes both (an attempt shows its cited titles)
export const knowledgeQueryKey = ['knowledge'] as const
export const articlesQueryKey = [...knowledgeQueryKey, 'articles'] as const

export function useKnowledge() {
  return useQuery({
    queryKey: articlesQueryKey,
    queryFn: async ({ signal }) => (await axios.get<KnowledgeArticle[]>('/api/knowledge', { signal })).data,
  })
}

export function useKnowledgeAttempts(page: number, pageSize = ATTEMPTS_DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: [...knowledgeQueryKey, 'attempts', { page, pageSize }],
    queryFn: async ({ signal }) =>
      (await axios.get<KnowledgeAttemptPage>('/api/knowledge/attempts', { params: { page, pageSize }, signal })).data,
    // The previous page stays on screen while the next one loads
    placeholderData: keepPreviousData,
  })
}

export function useCreateKnowledgeArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateKnowledgeArticleInput) =>
      (await axios.post<KnowledgeArticle>('/api/knowledge', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeQueryKey }),
  })
}

export function useUpdateKnowledgeArticle(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateKnowledgeArticleInput) =>
      (await axios.patch<KnowledgeArticle>(`/api/knowledge/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeQueryKey }),
  })
}

export function useDeleteKnowledgeArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/knowledge/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeQueryKey }),
  })
}
