import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "?";
}

export function ProfessionalAvatar({
  firstName,
  lastName,
  image,
  className,
}: {
  firstName: string;
  lastName: string;
  image: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-10", className)}>
      {image && <AvatarImage src={image} alt={`${firstName} ${lastName}`} />}
      <AvatarFallback className="bg-secondary font-display text-sm font-semibold text-secondary-foreground">
        {initials(firstName, lastName)}
      </AvatarFallback>
    </Avatar>
  );
}
