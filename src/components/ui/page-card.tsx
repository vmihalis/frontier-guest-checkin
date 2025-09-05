import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  gradient?: boolean;
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
}

export function PageCard({ 
  title, 
  description, 
  icon: Icon, 
  gradient = false, 
  className,
  headerClassName,
  children 
}: PageCardProps) {
  return (
    <Card 
      className={cn(
        // Standard Frontier Tower card styling
        "bg-card border border-border rounded-lg shadow-lg",
        // Optional gradient for special cards (like invites page)
        gradient && "bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-primary/20",
        className
      )}
    >
      <CardHeader className={cn(headerClassName)}>
        <CardTitle className={cn(
          "flex items-center gap-2 text-2xl font-bold text-foreground"
        )}>
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}