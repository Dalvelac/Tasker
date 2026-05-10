type EmptyStateProps = {
  title: string
  detail: string
}

export function EmptyState({ title, detail }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}
