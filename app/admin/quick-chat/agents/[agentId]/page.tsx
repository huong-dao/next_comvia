"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  HiArrowLeft,
  HiOutlineCloudArrowUp,
  HiOutlineCog6Tooth,
} from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/controls";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";

type AgentRow = {
  id: string;
  name?: string;
  provider?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  skills?: string[];
  active?: boolean;
};

export default function AdminQuickChatAgentEditPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [allowedTools, setAllowedTools] = useState("[]");
  const [skills, setSkills] = useState("[]");
  const [active, setActive] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetcher = useCallback((token: string) => comviaFetch<AgentRow[]>("/admin/quick-chat/agents", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  useEffect(() => {
    const current = (data ?? []).find((item) => item.id === agentId);
    if (!current) return;
    setName(current.name ?? "");
    setProvider(current.provider ?? "openai");
    setSystemPrompt(current.systemPrompt ?? "");
    setAllowedTools(JSON.stringify(current.allowedTools ?? [], null, 2));
    setSkills(JSON.stringify(current.skills ?? [], null, 2));
    setActive(Boolean(current.active));
  }, [data, agentId]);

  async function save() {
    const token = getAccessToken();
    if (!token) return;
    let tools: string[] = [];
    let parsedSkills: string[] = [];
    try {
      tools = JSON.parse(allowedTools || "[]") as string[];
      if (!Array.isArray(tools)) throw new Error("allowedTools phải là mảng JSON string.");
      parsedSkills = JSON.parse(skills || "[]") as string[];
      if (!Array.isArray(parsedSkills)) throw new Error("skills phải là mảng JSON string.");
    } catch {
      setMsg("allowedTools hoặc skills không phải JSON mảng hợp lệ.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/admin/quick-chat/agents/${agentId}`, {
        method: "PUT",
        token,
        body: JSON.stringify({
          name: name.trim() || undefined,
          provider,
          systemPrompt: systemPrompt.trim() || undefined,
          allowedTools: tools,
          skills: parsedSkills,
          active,
        }),
      });
      setMsg("Đã lưu.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Lưu thất bại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminRoleGate>
      {loading ? <PageLoading message="Đang tải agent…" /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      <PageHeader
        title="Chỉnh sửa agent"
        description={`PUT /admin/quick-chat/agents/${agentId} — body theo DTO backend.`}
      />
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild icon={<HiArrowLeft className="size-4" />}>
          <Link href="/admin/quick-chat/agents">← Danh sách agents</Link>
        </Button>
      </div>
      <Card className="max-w-xl space-y-4 p-4">
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">Tên</label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} leadingIcon={<HiOutlineCog6Tooth className="size-4" />} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">Provider</label>
          <Select className="mt-1" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="openai">openai</option>
            <option value="gemini">gemini</option>
            <option value="claude">claude</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">System prompt</label>
          <Textarea className="mt-1" rows={4} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">allowedTools (JSON array)</label>
          <Textarea className="mt-1 font-mono text-xs" rows={3} value={allowedTools} onChange={(e) => setAllowedTools(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">skills (JSON array)</label>
          <Textarea className="mt-1 font-mono text-xs" rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-muted/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Active</p>
            <p className="text-xs text-muted-foreground">Bật/tắt agent cho quick chat admin.</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        <Button type="button" disabled={busy} onClick={() => void save()} icon={<HiOutlineCloudArrowUp className="size-4" />}>
          Lưu
        </Button>
      </Card>
    </AdminRoleGate>
  );
}
