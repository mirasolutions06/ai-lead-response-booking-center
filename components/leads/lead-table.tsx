"use client";

import { useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreBadge } from "@/components/leads/score-badge";
import { StatusDot } from "@/components/leads/status-dot";
import type { InboxLead } from "@/lib/leads/queries";

export function LeadTable({ leads, onRowClick }: { leads: InboxLead[]; onRowClick: (leadId: string) => void }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);

  const columns = useMemo<ColumnDef<InboxLead>[]>(
    () => [
      {
        id: "name",
        header: "Lead",
        accessorFn: (row) => row.name ?? row.phone ?? row.email ?? "Unknown",
        cell: ({ getValue }) => <span className="font-medium text-gray-900">{getValue<string>()}</span>,
      },
      {
        id: "score",
        header: "Score",
        accessorFn: (row) => row.extractions[0]?.leadScore ?? 0,
        cell: ({ row }) => {
          const extraction = row.original.extractions[0];
          if (!extraction) return null;
          return <ScoreBadge score={extraction.leadScore} status={extraction.qualificationStatus} />;
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.extractions[0]?.qualificationStatus ?? "cold",
        cell: ({ row }) => {
          const extraction = row.original.extractions[0];
          if (!extraction) return null;
          return <StatusDot status={extraction.qualificationStatus} />;
        },
      },
      {
        id: "service",
        header: "Service",
        accessorFn: (row) => row.extractions[0]?.requestedService ?? "—",
        cell: ({ getValue }) => <span className="text-sm text-gray-600">{getValue<string>()}</span>,
      },
      {
        id: "source",
        header: "Source",
        accessorFn: (row) => row.source,
        cell: ({ getValue }) => <span className="text-sm text-gray-400">{getValue<string>()}</span>,
      },
      {
        id: "createdAt",
        header: "Received",
        accessorFn: (row) => row.createdAt,
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-400">{new Date(getValue<Date>()).toLocaleString()}</span>
        ),
      },
      {
        id: "nextAction",
        header: "Next action",
        accessorFn: (row) => row.extractions[0]?.recommendedNextAction ?? "—",
        cell: ({ getValue }) => <span className="text-sm text-gray-500">{getValue<string>()}</span>,
      },
    ],
    []
  );

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-lg border border-gray-100">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="cursor-pointer select-none text-xs uppercase text-gray-400"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onRowClick(row.original.id)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-gray-400">
                No leads yet — try Quick Intake to create one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
