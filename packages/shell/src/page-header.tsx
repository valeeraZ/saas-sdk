import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@frame/ui/components/breadcrumb";
import { Badge } from "@frame/ui/components/badge";
import { Fragment, type ReactNode } from "react";

export type FrameBreadcrumb = Readonly<{ href?: string; label: string }>;

export function FramePageHeader({
  actions,
  breadcrumbs = [],
  description,
  eyebrow,
  status,
  title,
}: Readonly<{
  actions?: ReactNode;
  breadcrumbs?: readonly FrameBreadcrumb[];
  description?: string;
  eyebrow?: string;
  status?: string;
  title: string;
}>) {
  return (
    <header className="flex flex-col gap-7 border-b border-border/70 pb-8">
      {breadcrumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <Fragment key={`${item.label}-${index}`}>
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-3">
            {eyebrow ? (
              <span className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primary">
                {eyebrow}
              </span>
            ) : null}
            {status ? <Badge variant="secondary">{status}</Badge> : null}
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
