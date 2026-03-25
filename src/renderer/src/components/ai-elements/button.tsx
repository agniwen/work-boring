'use client';

import { Button as HeroButton } from '@heroui/react';
import { cn } from '@renderer/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

const aiElementsButtonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80 active:translate-y-px',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
        outline:
          'border-border bg-input/30 hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
      },
      size: {
        default:
          'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        icon: 'size-9',
        'icon-lg': 'size-10',
        'icon-sm': 'size-8',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        lg: 'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        sm: 'h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type AIElementsButtonVariant = NonNullable<
  VariantProps<typeof aiElementsButtonVariants>['variant']
>;
type AIElementsButtonSize = NonNullable<VariantProps<typeof aiElementsButtonVariants>['size']>;

const heroVariantMap: Record<
  AIElementsButtonVariant,
  'primary' | 'outline' | 'secondary' | 'ghost' | 'danger-soft'
> = {
  default: 'primary',
  destructive: 'danger-soft',
  ghost: 'ghost',
  link: 'ghost',
  outline: 'outline',
  secondary: 'secondary',
};

const heroSizeMap: Record<AIElementsButtonSize, 'sm' | 'md' | 'lg'> = {
  default: 'md',
  icon: 'md',
  'icon-lg': 'lg',
  'icon-sm': 'sm',
  'icon-xs': 'sm',
  lg: 'lg',
  sm: 'sm',
  xs: 'sm',
};

export type ButtonProps = Omit<React.ComponentProps<'button'>, 'disabled'> & {
  disabled?: boolean;
} & VariantProps<typeof aiElementsButtonVariants> & {
    asChild?: boolean;
  };

const isIconOnlySize = (size: AIElementsButtonSize) => size.startsWith('icon');

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant: variantProp = 'default',
    size: sizeProp = 'default',
    asChild = false,
    disabled,
    type = 'button',
    value,
    ...props
  },
  ref,
) {
  const variant = variantProp ?? 'default';
  const size = sizeProp ?? 'default';
  const classes = cn(aiElementsButtonVariants({ variant, size }), className);
  const heroProps = props as unknown as Omit<React.ComponentProps<typeof HeroButton>, 'children'>;

  if (asChild) {
    return (
      <Slot.Root
        className={classes}
        data-size={size}
        data-slot='button'
        data-variant={variant}
        {...props}
      />
    );
  }

  return (
    <HeroButton
      ref={ref}
      className={classes}
      data-size={size}
      data-variant={variant}
      isDisabled={disabled}
      isIconOnly={isIconOnlySize(size)}
      size={heroSizeMap[size]}
      type={type}
      value={
        typeof value === 'string'
          ? value
          : typeof value === 'number'
            ? String(value)
            : Array.isArray(value)
              ? value.join(',')
              : undefined
      }
      variant={heroVariantMap[variant]}
      {...heroProps}
    />
  );
});
