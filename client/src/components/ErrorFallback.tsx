import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// Rendered by the top-level error boundary, above the router and query provider: keep it free of hooks that need them
export function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            An unexpected error occurred. It has been reported. Reload the page to try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    </div>
  )
}
