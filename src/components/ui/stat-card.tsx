import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconColor?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  trend?: {
    value: number;
    positive: boolean;
    label?: string;
  };
  className?: string;
}

const iconColorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600', 
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  purple: 'text-purple-600',
};

export function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  iconColor = 'blue',
  trend,
  className 
}: StatCardProps) {
  return (
    <Card className={cn("bg-white border border-gray-300 rounded-lg shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", iconColorClasses[iconColor])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-800">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <p className="text-xs text-gray-600">
          {description}
          {trend && (
            <span className={cn(
              "ml-1 font-medium",
              trend.positive ? "text-green-600" : "text-red-600"
            )}>
              {trend.positive ? '+' : ''}{trend.value}
              {trend.label && ` ${trend.label}`}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}