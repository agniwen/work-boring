import { Chip, Surface, Table, Tabs, Tooltip, TooltipContent, TooltipTrigger } from '@heroui/react';
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
    <div className='pt-4'>
      <DashboardHeaderStartContent>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-foreground'>Skills</span>
        </div>
      </DashboardHeaderStartContent>
      {installedSkillsQuery.error ? (
        <Surface
          className='rounded-[1.75rem] border border-red-200 bg-red-50/90 p-5'
          variant='default'
        >
          <p className='text-sm text-red-700'>
            {installedSkillsQuery.error instanceof Error
              ? installedSkillsQuery.error.message
              : 'Failed to load installed skills.'}
          </p>
        </Surface>
      ) : null}

      {installedSkillsQuery.data ? (
        <Tabs className='w-full' defaultSelectedKey='effective'>
          <Tabs.ListContainer>
            <Tabs.List>
              <Tabs.Tab id='effective'>
                已生效Skills
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id='shadowed'>
                被覆盖Skills
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel className='py-2' id='effective'>
            <SkillsSection
              description='按优先级去重后当前实际生效的 skills。'
              emptyLabel='暂无已生效Skills。'
              skills={installedSkillsQuery.data.skills}
              title='已生效Skill'
            />
          </Tabs.Panel>
          <Tabs.Panel className='py-2' id='shadowed'>
            <SkillsSection
              description='同名但被更高优先级目录覆盖的 skills。'
              emptyLabel='暂无被覆盖Skill。'
              skills={installedSkillsQuery.data.shadowedSkills}
              title='被覆盖Skills'
            />
          </Tabs.Panel>
        </Tabs>
      ) : null}
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
    <Surface
      className='rounded-[1.5rem] border border-border/70 bg-background/80 px-4 py-4 text-sm text-muted-foreground'
      variant='default'
    >
      {props.emptyLabel}
    </Surface>
  );
}

function SkillsTable(props: { skills: InstalledSkill[]; title: string }) {
  return (
    <Table aria-label={props.title}>
      <Table.ScrollContainer className='w-full overflow-x-auto'>
        <Table.Content className='min-w-330'>
          <Table.Header>
            <Table.Column isRowHeader className='w-px whitespace-nowrap'>
              名称
            </Table.Column>
            <Table.Column className='w-px whitespace-nowrap'>描述</Table.Column>
            <Table.Column className='w-px whitespace-nowrap'>状态</Table.Column>
            <Table.Column className='w-px whitespace-nowrap'>范围</Table.Column>
            <Table.Column className='w-px whitespace-nowrap'>来源</Table.Column>
            <Table.Column className='w-px whitespace-nowrap'>位置</Table.Column>
            <Table.Column className='w-px whitespace-nowrap'>根目录</Table.Column>
            <Table.Column className='w-px whitespace-nowrap'>被覆盖来源</Table.Column>
            <Table.Column className='w-px whitespace-nowrap'>诊断信息</Table.Column>
          </Table.Header>
          <Table.Body items={props.skills}>
            {(skill) => (
              <Table.Row id={`${skill.name}:${skill.location}`}>
                <Table.Cell>
                  <TooltipTextCell maxWidthClassName='max-w-40' tone='primary' value={skill.name} />
                </Table.Cell>
                <Table.Cell>
                  <TooltipTextCell maxWidthClassName='max-w-64' value={skill.description} />
                </Table.Cell>
                <Table.Cell>
                  <StatusChip>{skill.isShadowed ? 'shadowed' : 'active'}</StatusChip>
                </Table.Cell>
                <Table.Cell>
                  <StatusChip>{skill.scope}</StatusChip>
                </Table.Cell>
                <Table.Cell>
                  <StatusChip>{skill.sourceKind}</StatusChip>
                </Table.Cell>
                <Table.Cell>
                  <TooltipTextCell maxWidthClassName='max-w-56' mono value={skill.location} />
                </Table.Cell>
                <Table.Cell>
                  <TooltipTextCell maxWidthClassName='max-w-52' mono value={skill.baseDir} />
                </Table.Cell>
                <Table.Cell>
                  <TooltipTextCell
                    maxWidthClassName='max-w-52'
                    mono
                    value={skill.shadowedBy ?? '—'}
                  />
                </Table.Cell>
                <Table.Cell>
                  <DiagnosticsCell diagnostics={skill.diagnostics} />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
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
      <TooltipTrigger>
        <div
          className={`${props.maxWidthClassName ?? 'max-w-64'} cursor-default text-sm leading-6 wrap-break-word ${
            props.mono ? 'font-mono text-xs' : ''
          } ${props.tone === 'primary' ? 'font-semibold text-foreground' : 'text-muted-foreground'} line-clamp-2`}
        >
          {props.value}
        </div>
      </TooltipTrigger>
      <TooltipContent placement='top start'>
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
    <Chip className='bg-background/80 text-muted-foreground shadow-none' size='sm'>
      {props.children}
    </Chip>
  );
}

function DiagnosticsCell(props: { diagnostics: string[] }) {
  if (props.diagnostics.length === 0) {
    return <span className='text-sm text-muted-foreground'>No diagnostics</span>;
  }

  const previewText = props.diagnostics.join(' • ');

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className='max-w-56 cursor-default space-y-2'>
          <Chip className='bg-background/80 text-muted-foreground shadow-none' size='sm'>
            {props.diagnostics.length} 条诊断
          </Chip>
          <p className='line-clamp-2 text-sm leading-6 text-muted-foreground'>{previewText}</p>
        </div>
      </TooltipTrigger>
      <TooltipContent placement='top start'>
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
