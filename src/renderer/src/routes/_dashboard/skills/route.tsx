import { Badge } from '@renderer/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip';
import { orpc, orpcClient } from '@renderer/lib/orpc';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { DashboardHeaderStartContent } from '../-components/dashboard-header-portal';

export const Route = createFileRoute('/_dashboard/skills')({
  component: SkillsManagement,
});

function SkillsManagement() {
  const installedSkillsQuery = useQuery({
    ...orpc.skills.list.queryOptions(),
    gcTime: 0,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  return (
    <div className='h-[calc(100vh-3.25rem)] space-y-5 overflow-hidden'>
      <DashboardHeaderStartContent>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-foreground'>Skills</span>
        </div>
      </DashboardHeaderStartContent>
      <div className='h-full space-y-4 overflow-auto p-4'>
        {installedSkillsQuery.error ? (
          <div className='rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5'>
            <p className='text-sm text-destructive'>
              {installedSkillsQuery.error instanceof Error
                ? installedSkillsQuery.error.message
                : 'Failed to load installed skills.'}
            </p>
          </div>
        ) : null}

        {installedSkillsQuery.data ? (
          <Tabs className='w-full' defaultValue='effective'>
            <TabsList>
              <TabsTrigger value='effective'>已生效Skills</TabsTrigger>
              <TabsTrigger value='shadowed'>被覆盖Skills</TabsTrigger>
            </TabsList>
            <TabsContent className='py-2' value='effective'>
              <SkillsSection
                description='按优先级去重后当前实际生效的 skills。'
                emptyLabel='暂无已生效Skills。'
                skills={installedSkillsQuery.data.skills}
                title='已生效Skill'
              />
            </TabsContent>
            <TabsContent className='py-2' value='shadowed'>
              <SkillsSection
                description='同名但被更高优先级目录覆盖的 skills。'
                emptyLabel='暂无被覆盖Skill。'
                skills={installedSkillsQuery.data.shadowedSkills}
                title='被覆盖Skills'
              />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </div>
  );
}

type InstalledSkill = Awaited<ReturnType<typeof orpcClient.skills.list>>['skills'][number];

function SkillsSection(props: {
  description: string;
  emptyLabel: string;
  skills: InstalledSkill[];
  title: string;
}) {
  return props.skills.length > 0 ? (
    <div className='space-y-3'>
      <div>
        <h2 className='text-lg font-semibold text-foreground'>{props.title}</h2>
        <p className='text-sm text-muted-foreground'>{props.description}</p>
      </div>
      <SkillsTable skills={props.skills} title={props.title} />
    </div>
  ) : (
    <div className='rounded-[1.5rem] border border-border/70 bg-background/80 px-4 py-4 text-sm text-muted-foreground'>
      {props.emptyLabel}
    </div>
  );
}

function SkillsTable(props: { skills: InstalledSkill[]; title: string }) {
  return (
    <div className='w-full overflow-x-auto'>
      <Table className='min-w-[830px]'>
        <TableHeader>
          <TableRow>
            <TableHead className='w-px whitespace-nowrap'>名称</TableHead>
            <TableHead className='w-px whitespace-nowrap'>描述</TableHead>
            <TableHead className='w-px whitespace-nowrap'>状态</TableHead>
            <TableHead className='w-px whitespace-nowrap'>范围</TableHead>
            <TableHead className='w-px whitespace-nowrap'>来源</TableHead>
            <TableHead className='w-px whitespace-nowrap'>位置</TableHead>
            <TableHead className='w-px whitespace-nowrap'>根目录</TableHead>
            <TableHead className='w-px whitespace-nowrap'>被覆盖来源</TableHead>
            <TableHead className='w-px whitespace-nowrap'>诊断信息</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.skills.map((skill) => (
            <TableRow key={`${skill.name}:${skill.location}`}>
              <TableCell>
                <TooltipTextCell maxWidthClassName='max-w-40' tone='primary' value={skill.name} />
              </TableCell>
              <TableCell>
                <TooltipTextCell maxWidthClassName='max-w-64' value={skill.description} />
              </TableCell>
              <TableCell>
                <StatusChip>{skill.isShadowed ? 'shadowed' : 'active'}</StatusChip>
              </TableCell>
              <TableCell>
                <StatusChip>{skill.scope}</StatusChip>
              </TableCell>
              <TableCell>
                <StatusChip>{skill.sourceKind}</StatusChip>
              </TableCell>
              <TableCell>
                <TooltipTextCell maxWidthClassName='max-w-56' mono value={skill.location} />
              </TableCell>
              <TableCell>
                <TooltipTextCell maxWidthClassName='max-w-52' mono value={skill.baseDir} />
              </TableCell>
              <TableCell>
                <TooltipTextCell
                  maxWidthClassName='max-w-52'
                  mono
                  value={skill.shadowedBy ?? '—'}
                />
              </TableCell>
              <TableCell>
                <DiagnosticsCell diagnostics={skill.diagnostics} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TooltipTextCell(props: {
  maxWidthClassName?: string;
  mono?: boolean;
  tone?: 'default' | 'primary';
  value: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`${props.maxWidthClassName ?? 'max-w-64'} cursor-default text-sm leading-6 wrap-break-word ${
            props.mono ? 'font-mono text-xs' : ''
          } ${props.tone === 'primary' ? 'font-semibold text-foreground' : 'text-muted-foreground'} line-clamp-2`}
        >
          {props.value}
        </div>
      </TooltipTrigger>
      <TooltipContent side='top' align='start'>
        <p
          className={`max-w-lg wrap-break-word whitespace-pre-wrap ${props.mono ? 'font-mono text-xs' : 'text-sm'}`}
        >
          {props.value}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function StatusChip(props: { children: ReactNode }) {
  return (
    <Badge variant='secondary' className='shadow-none'>
      {props.children}
    </Badge>
  );
}

function DiagnosticsCell(props: { diagnostics: string[] }) {
  if (props.diagnostics.length === 0) {
    return <span className='text-sm text-muted-foreground'>No diagnostics</span>;
  }

  const previewText = props.diagnostics.join(' • ');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='max-w-56 cursor-default space-y-2'>
          <Badge variant='secondary' className='shadow-none'>
            {props.diagnostics.length} 条诊断
          </Badge>
          <p className='line-clamp-2 text-sm leading-6 text-muted-foreground'>{previewText}</p>
        </div>
      </TooltipTrigger>
      <TooltipContent side='top' align='start'>
        <div className='max-w-lg space-y-2'>
          {props.diagnostics.map((diagnostic) => (
            <p key={diagnostic} className='text-sm leading-6 wrap-break-word'>
              {diagnostic}
            </p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
