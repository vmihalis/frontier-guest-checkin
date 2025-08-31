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
        "bg-white border border-gray-300 rounded-lg shadow-lg",
        // Optional gradient for special cards (like invites page)
        gradient && "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200",
        className
      )}
    >
      <CardHeader className={cn(headerClassName)}>
        <CardTitle className={cn(
          "flex items-center gap-2 text-2xl font-bold text-gray-800"
        )}>
          {Icon && <Icon className="h-6 w-6 text-blue-600" />}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-gray-800">
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