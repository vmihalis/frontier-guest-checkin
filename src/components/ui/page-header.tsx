import React from 'react';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  showLogo = true, 
  actions,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 admin-header",
      className
    )}>
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {showLogo && <Logo size="sm" className="rounded-lg" />}
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-lg text-foreground hidden md:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-4">
          {actions}
        </div>
      )}
    </div>
  );
}