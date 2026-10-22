import { defaultOptions, sourceSignature } from "../src/model/engine.ts";
export async function verify6(tokens: string[]) {
  const checks: Record<string, boolean> = {},
    detail: Record<string, unknown> = {};
  const runs: any[] = [],
    active: { token: string; reservation: any }[] = [];
  async function request(path: string, token: string, body?: unknown) {
    for (let attempt = 0; attempt < 7; attempt++) {
      const response = await fetch(process.env.API_URL! + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 800 + attempt * 300));
        continue;
      }
      return { status: response.status, data: await response.json() };
    }
    throw Error("ThrottleRetryExhausted");
  }
  async function waitJob(token: string, id: string) {
    for (let i = 0; i < 45; i++) {
      const result = await request(`/v1/jobs/${id}`, token);
      if (["SUCCEEDED", "FAILED"].includes(result.data.job?.state))
        return result.data.job;
      await new Promise((r) => setTimeout(r, 700));
    }
    throw Error("JobTimeout");
  }
  try {
    const workspaces = [];
    for (const token of tokens) {
      const w = (await request("/v1/workspace", token)).data.workspace;
      const s = w.shipments.find((s: any) => s.id === "FR-101");
      const started = await request("/v1/analysis-jobs", token, {
        requestId: crypto.randomUUID(),
        shipmentId: s.id,
        options: defaultOptions(s),
        name: "Phase 6 isolated capacity verification",
        expectedSource: sourceSignature(s, w.destinations),
      });
      if (started.status !== 202 && started.status !== 200)
        throw Error(`AnalysisStart:${JSON.stringify(started.data)}`);
      const job = await waitJob(token, started.data.job.id);
      checks[`asyncAnalysis${runs.length + 1}`] = job.state === "SUCCEEDED";
      if (!job.result?.runId)
        throw Error(`AnalysisFailed:${JSON.stringify(job.errors)}`);
      const latest = (await request("/v1/workspace", token)).data.workspace;
      const run = latest.analyses.find((r: any) => r.id === job.result.runId);
      const candidate = run.result.candidates.find(
        (c: any) => c.destinationId === "eastside" && c.feasible,
      );
      if (!candidate) throw Error("EastsideCandidateMissing");
      runs.push({ run, candidate, jobId: job.id });
      workspaces.push(latest);
    }
    detail.analysisJobIds = runs.map((r) => r.jobId);
    const foreign = await request("/v1/reservations", tokens[1], {
      runId: runs[0].run.id,
      candidateId: runs[0].candidate.id,
    });
    checks.foreignRunDenied = foreign.status === 404;
    const race = await Promise.all(
      tokens.map((token, i) =>
        request("/v1/reservations", token, {
          runId: runs[i].run.id,
          candidateId: runs[i].candidate.id,
        }),
      ),
    );
    checks.concurrentReservationOneWinner =
      race.filter((r) => r.status === 200).length === 1 &&
      race.filter((r) => r.status === 409).length === 1;
    const index = race.findIndex((r) => r.status === 200);
    if (index < 0) throw Error(`NoRaceWinner:${JSON.stringify(race)}`);
    const token = tokens[index],
      other = tokens[1 - index],
      r = race[index].data.reservation;
    active.push({ token, reservation: r });
    const repeat = await request("/v1/reservations", token, {
      runId: r.runId,
      candidateId: r.candidateId,
    });
    const board = (await request("/v1/fulfilment", token)).data;
    checks.retryDoesNotReserveAgain =
      repeat.data.reservation?.id === r.id &&
      board.network.find((d: any) => d.id === "eastside").reservedKg === 500;
    checks.foreignReportDenied =
      (await request(`/v1/reservations/${r.id}/report`, other)).status === 404;
    checks.foreignStatusDenied =
      (
        await request(`/v1/reservations/${r.id}/status`, other, {
          status: "CANCELLED",
          expectedVersion: 1,
        })
      ).status === 404;
    checks.cannotSkipDispatch =
      (
        await request(`/v1/reservations/${r.id}/status`, token, {
          status: "DELIVERED",
          expectedVersion: 1,
        })
      ).status === 409;
    checks.legacyConfirmationBlocked =
      (
        await request("/v1/commands", token, {
          action: "confirmAnalysis",
          args: [r.runId, r.candidateId],
          expectedRevision: board.revision || 0,
        })
      ).status === 403;
    let report: any;
    for (let i = 0; i < 50; i++) {
      report = await request(`/v1/reservations/${r.id}/report`, token);
      if (report.data.ready) break;
      await new Promise((r) => setTimeout(r, 700));
    }
    checks.privateReportReady = report.data.ready === true;
    if (report.data.url) {
      const pdf = await fetch(report.data.url),
        bytes = new Uint8Array(await pdf.arrayBuffer());
      checks.signedPdfDownloads =
        pdf.status === 200 &&
        new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
      const unsigned = new URL(report.data.url);
      unsigned.search = "";
      checks.unsignedReportDenied = (await fetch(unsigned)).status === 403;
      checks.shortLivedDownload = report.data.expiresIn === 120;
    }
    const updated = (await request("/v1/fulfilment", token)).data;
    const notification = updated.inbox.find(
      (m: any) => m.reservationId === r.id,
    );
    checks.inAppNotificationCreated = !!notification;
    if (notification)
      checks.markReadPersists =
        (
          await request(
            `/v1/inbox/${encodeURIComponent(notification.id)}/read`,
            token,
            {},
          )
        ).status === 200 &&
        (await request("/v1/fulfilment", token)).data.inbox.find(
          (m: any) => m.id === notification.id,
        )?.read === true;
    const dispatched = await request(`/v1/reservations/${r.id}/status`, token, {
      status: "DISPATCHED",
      expectedVersion: 1,
    });
    active[0].reservation = dispatched.data.reservation || r;
    checks.dispatchPreservesCapacity =
      dispatched.status === 200 &&
      (await request("/v1/fulfilment", token)).data.network.find(
        (d: any) => d.id === "eastside",
      ).reservedKg === 500;
    checks.cannotCancelDispatched =
      (
        await request(`/v1/reservations/${r.id}/status`, token, {
          status: "CANCELLED",
          expectedVersion: 2,
        })
      ).status === 409;
    const delivered = await request(`/v1/reservations/${r.id}/status`, token, {
      status: "DELIVERED",
      expectedVersion: 2,
    });
    active[0].reservation = delivered.data.reservation || active[0].reservation;
    const retryDelivered = await request(
      `/v1/reservations/${r.id}/status`,
      token,
      { status: "DELIVERED", expectedVersion: 2 },
    );
    checks.deliveryReleasesOnce =
      delivered.status === 200 &&
      retryDelivered.status === 200 &&
      (await request("/v1/fulfilment", token)).data.network.find(
        (d: any) => d.id === "eastside",
      ).reservedKg === 0;
    checks.timelinePreserved = delivered.data.reservation?.events.length === 3;
    // Use the other owner's fresh run after capacity returns to zero, then test cancellation.
    const w = (await request("/v1/workspace", other)).data.workspace,
      s = w.shipments.find((s: any) => s.id === "FR-101");
    const started = await request("/v1/analysis-jobs", other, {
      requestId: crypto.randomUUID(),
      shipmentId: s.id,
      options: defaultOptions(s),
      name: "Cancellation verification",
      expectedSource: sourceSignature(s, w.destinations),
    });
    const job = await waitJob(other, started.data.job.id),
      latest = (await request("/v1/workspace", other)).data.workspace,
      run = latest.analyses.find((x: any) => x.id === job.result.runId),
      candidate = run.result.candidates.find(
        (x: any) => x.destinationId === "eastside" && x.feasible,
      );
    const reserved = await request("/v1/reservations", other, {
      runId: run.id,
      candidateId: candidate.id,
    });
    if (reserved.status !== 200) throw Error("CancellationReserveFailed");
    const cancelR = reserved.data.reservation;
    active.push({ token: other, reservation: cancelR });
    const cancelled = await request(
      `/v1/reservations/${cancelR.id}/status`,
      other,
      { status: "CANCELLED", expectedVersion: 1 },
    );
    active[1].reservation = cancelled.data.reservation || cancelR;
    const again = await request(
      `/v1/reservations/${cancelR.id}/status`,
      other,
      { status: "CANCELLED", expectedVersion: 1 },
    );
    checks.cancellationReleasesOnce =
      cancelled.status === 200 &&
      again.status === 200 &&
      (await request("/v1/fulfilment", other)).data.network.find(
        (d: any) => d.id === "eastside",
      ).reservedKg === 0;
    checks.cannotReactivateCancelled =
      (
        await request(`/v1/reservations/${cancelR.id}/status`, other, {
          status: "DISPATCHED",
          expectedVersion: 2,
        })
      ).status === 409;
    detail.reservationIds = active.map((x) => x.reservation.id);
  } catch (error) {
    detail.failure = (error as Error).message;
  } finally {
    const cleanup = [];
    for (const entry of active) {
      const board = await request("/v1/fulfilment", entry.token),
        r = board.data.reservations?.find(
          (x: any) => x.id === entry.reservation.id,
        );
      if (r && ["CONFIRMED", "DISPATCHED"].includes(r.status))
        cleanup.push(
          await request(`/v1/reservations/${r.id}/status`, entry.token, {
            status: r.status === "CONFIRMED" ? "CANCELLED" : "DELIVERED",
            expectedVersion: r.version,
          }),
        );
    }
    detail.activeCleanupSuccessful = cleanup.every((x) => x.status === 200);
  }
  return {
    checks,
    detail,
    pass: !detail.failure && Object.values(checks).every(Boolean),
  };
}
