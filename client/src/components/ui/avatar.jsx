import { cn } from "../../lib/utils"

const sizes = { xs: "h-5 w-5 text-[10px]", sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-16 w-16 text-xl", xl: "h-24 w-24 text-3xl" }

// Shows the user's picture; falls back to an initial if there is none.
export function Avatar({ user, size = "md", className }) {
  const initial = (user?.fullName || user?.userName || "?").charAt(0).toUpperCase()
  const usable = user?.avatar && !user.avatar.includes("ui-avatars.com")

  return usable ? (
    <img
      src={user.avatar}
      alt={user.fullName || user.userName || "User"}
      className={cn("shrink-0 rounded-full border border-border object-cover bg-muted", sizes[size], className)}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-semibold text-secondary-foreground",
        sizes[size],
        className
      )}
    >
      {initial}
    </span>
  )
}
