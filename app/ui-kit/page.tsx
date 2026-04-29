"use client";

import { useState } from "react";
import { FiArrowRight, FiPlus } from "react-icons/fi";
import { HiOutlineMail, HiOutlineUser } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Switch, Checkbox, Radio } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/app/page-header";
import { PageEmpty, PageError, PageLoading } from "@/components/app/page-state";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { WorkspaceTopbar } from "@/components/layout/workspace-topbar";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Modal } from "@/components/ui/modal";
import { SimpleTable } from "@/components/ui/simple-table";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function UiKitPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState<"active" | "inactive">("active");
  const [comboValue, setComboValue] = useState("");
  const [kitPage, setKitPage] = useState(3);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Comvia UI Kit</p>
          <h1 className="text-3xl font-semibold">Reusable Components</h1>
        </div>
        <ThemeToggle />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardTitle>Typography & Colors</CardTitle>
          <div className="mt-5 space-y-6">
            <div>
              <p className="text-4xl font-bold">Manrope Bold</p>
              <p className="text-sm text-secondary">Primary display & headings</p>
            </div>
            <div>
              <p className="text-xl font-medium">Inter Medium</p>
              <p className="text-sm text-secondary">Body, labels & utility</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-3">
                <span className="size-8 rounded-md bg-primary" />
                <p className="text-sm">Primary Cyan</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-3">
                <span className="size-8 rounded-md bg-secondary" />
                <p className="text-sm">Secondary Aqua</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-3">
                <span className="size-8 rounded-md bg-accent" />
                <p className="text-sm">Accent Lavender</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Buttons & Actions</CardTitle>
          <div className="mt-6 grid grid-cols-[120px_repeat(3,minmax(0,1fr))] gap-3 text-sm">
            <p className="text-muted-foreground">Variant</p>
            <p className="text-muted-foreground">Normal</p>
            <p className="text-muted-foreground">Hover</p>
            <p className="text-muted-foreground">Disabled</p>

            <p className="self-center text-muted-foreground">Primary</p>
            <Button>Action</Button>
            <Button className="brightness-110">Action</Button>
            <Button disabled>Action</Button>

            <p className="self-center text-muted-foreground">Secondary</p>
            <Button variant="secondary">Manage</Button>
            <Button variant="secondary" className="brightness-110">
              Manage
            </Button>
            <Button variant="secondary" disabled>
              Manage
            </Button>

            <p className="self-center text-muted-foreground">Accent</p>
            <Button variant="accent">Special</Button>
            <Button variant="accent" className="brightness-105">
              Special
            </Button>
            <Button variant="accent" disabled>
              Special
            </Button>

            <p className="self-center text-muted-foreground">Ghost</p>
            <Button variant="ghost">Cancel</Button>
            <Button variant="ghost" className="bg-surface-muted">
              Cancel
            </Button>
            <Button variant="ghost" disabled>
              Cancel
            </Button>

            <p className="self-center text-muted-foreground">Outline</p>
            <Button variant="outline">View</Button>
            <Button variant="outline" className="border-primary text-primary">
              View
            </Button>
            <Button variant="outline" disabled>
              View
            </Button>

            <p className="self-center text-muted-foreground">With Icon</p>
            <Button icon={<FiPlus className="size-4" />}>Create</Button>
            <Button icon={<FiArrowRight className="size-4" />} iconPosition="right">
              Continue
            </Button>
            <Button icon={<FiPlus className="size-4" />} disabled>
              Create
            </Button>
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle>Data Tables</CardTitle>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Input placeholder="Search records..." className="max-w-md" />
          <Button variant="ghost">Filter</Button>
          <Button variant="secondary">Export Data</Button>
        </div>
        <DataTable
          className="mt-4"
          rows={[
            {
              name: "Quarterly_Report_Q3.pdf",
              type: "Document",
              status: "active",
              date: "Oct 24, 2023",
            },
            {
              name: "Hero_Banner_v2.png",
              type: "Image Asset",
              status: "pending",
              date: "Oct 22, 2023",
            },
            {
              name: "Legacy_Migration_Log.txt",
              type: "Log File",
              status: "error",
              date: "Oct 21, 2023",
            },
          ]}
        />
      </Card>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>Form Inputs</CardTitle>
          <div className="mt-5 space-y-3">
            <Input placeholder="Enter text..." />
            <Input
              placeholder="Nguyễn Văn A"
              leadingIcon={<HiOutlineUser className="size-4" />}
            />
            <Input
              placeholder="name@company.com"
              leadingIcon={<HiOutlineMail className="size-4" />}
            />
            <Input value="System Administrator" readOnly />
            <Input value="Active interaction" forceActive readOnly />
            <Input
              value="Invalid entry"
              invalid
              errorMessage="Please enter a valid email address"
              readOnly
            />
            <Select defaultValue="high">
              <option value="low">Priority: Low</option>
              <option value="medium">Priority: Medium</option>
              <option value="high">Priority: High</option>
            </Select>
            <Textarea placeholder="Describe your issue..." rows={3} />
          </div>
        </Card>

        <Card>
          <CardTitle>Searchable select &amp; pagination</CardTitle>
          <div className="mt-5 max-w-md space-y-4">
            <SearchableSelect
              aria-label="Demo combo"
              options={[
                { value: "a", label: "Alpha", description: "Mô tả phụ" },
                { value: "b", label: "Bravo" },
                { value: "c", label: "Charlie" },
              ]}
              value={comboValue}
              onValueChange={setComboValue}
              placeholder="Chọn mục (gõ để lọc)"
            />
            <div>
              <p className="mb-2 text-xs text-muted-foreground">PaginationBar — ví dụ 11 trang, đang ở trang {kitPage}</p>
              <PaginationBar currentPage={kitPage} totalPages={11} onPageChange={setKitPage} />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Selection Controls</CardTitle>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm">Notifications Enabled</p>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">Dark Mode</p>
              <Switch checked={darkModeEnabled} onCheckedChange={setDarkModeEnabled} />
            </div>
            <Checkbox checked={checked} onCheckedChange={setChecked} label="Selected Option" />
            <Checkbox checked={!checked} onCheckedChange={(value) => setChecked(!value)} label="Unselected Option" />
            <Radio
              checked={radio === "active"}
              onCheckedChange={() => setRadio("active")}
              label="Active Choice"
            />
            <Radio
              checked={radio === "inactive"}
              onCheckedChange={() => setRadio("inactive")}
              label="Inactive Choice"
            />
            <Button onClick={() => setModalOpen(true)}>Open Modal Demo</Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Workspace Switcher</CardTitle>
          <div className="mt-5 max-w-sm">
            <WorkspaceSwitcher activeWorkspaceId="workspace-sample" />
          </div>
        </Card>

        <Card>
          <CardTitle>Workspace Header</CardTitle>
          <div className="mt-5">
            <WorkspaceTopbar />
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Page chrome</CardTitle>
          <div className="mt-4 space-y-4">
            <PageHeader eyebrow="Section" title="Page title" description="Mô tả ngắn cho trang." />
            <PageLoading message="Đang tải mẫu…" />
            <PageError message="Thông báo lỗi mẫu." onRetry={() => undefined} />
            <PageEmpty title="Chưa có dữ liệu" description="Gợi ý hành động tiếp theo." />
          </div>
        </Card>
        <Card>
          <CardTitle>Tables & status</CardTitle>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <EntityStatusBadge value="APPROVED" />
              <EntityStatusBadge value="PENDING_ZALO_APPROVAL" />
              <EntityStatusBadge value="FAILED" />
            </div>
            <SimpleTable
              rows={[
                { id: "1", a: "Alpha", b: "100" },
                { id: "2", a: "Beta", b: "200" },
              ]}
              getRowKey={(r) => r.id}
              columns={[
                { key: "a", header: "Cột A", cell: (r) => r.a },
                { key: "b", header: "Cột B", cell: (r) => r.b },
              ]}
            />
          </div>
        </Card>
      </section>

      <Modal
        open={modalOpen}
        title="Modal có footer tùy chỉnh"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Đóng
            </Button>
            <Button type="button" onClick={() => setModalOpen(false)}>
              Xác nhận
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input placeholder="John Doe" />
          <Input placeholder="john@example.com" />
        </div>
        <Select defaultValue="issue">
          <option value="issue">Technical Issue</option>
          <option value="billing">Billing Issue</option>
        </Select>
        <Textarea placeholder="Describe your issue..." rows={5} />
      </Modal>
    </main>
  );
}
