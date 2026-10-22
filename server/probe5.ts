export async function verify5(token: string, other: string) {
  const checks: Record<string, boolean> = {};
  async function request(path: string, auth: string, body?: unknown) {
    for (let i = 0; i < 6; i++) {
      const response = await fetch(process.env.API_URL! + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${auth}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 900));
        continue;
      }
      return { status: response.status, data: await response.json() };
    }
    throw Error("ThrottleRetryExhausted");
  }
  try {
    const header =
      "produce,quantityKg,origin,destinationId,valuePerKg,initialQuality,remainingTravelHours,delayHours,eta,history\n";
    const row =
      'Tomatoes,100,"Phase 5 isolated import hub",eastside,30,95,2.25,1,14:00,2@10;1@18\n';
    for (const valid of [true, false]) {
      const before = (await request("/v1/workspace", token)).data.workspace;
      const csv =
        header +
        row +
        (valid ? "" : row.replace("Tomatoes,100", "Tomatoes,-5"));
      const body = {
        requestId: crypto.randomUUID(),
        name: valid ? "verified.csv" : "invalid.csv",
        bytes: Buffer.byteLength(csv),
      };
      const started = await request("/v1/imports", token, body);
      if (started.status !== 201)
        throw Error(`ImportStart:${JSON.stringify(started.data)}`);
      const jobId = started.data.job.id;
      const put = await fetch(started.data.uploadUrl, {
        method: "PUT",
        headers: started.data.headers,
        body: csv,
      });
      checks[valid ? "presignedCsvUpload" : "invalidCsvUpload"] =
        put.status === 200;
      if (valid) {
        checks.foreignJobDenied =
          (await request(`/v1/jobs/${jobId}`, other)).status === 404;
        checks.foreignCompletionDenied =
          (await request(`/v1/imports/${jobId}/complete`, other, {})).status ===
          404;
      }
      await request(`/v1/imports/${jobId}/complete`, token, {});
      await request(`/v1/imports/${jobId}/complete`, token, {});
      let job: any;
      for (let i = 0; i < 45; i++) {
        job = (await request(`/v1/jobs/${jobId}`, token)).data.job;
        if (["SUCCEEDED", "FAILED"].includes(job.state)) break;
        await new Promise((r) => setTimeout(r, 700));
      }
      const after = (await request("/v1/workspace", token)).data.workspace;
      if (valid) {
        checks.queuedCsvImported =
          job.state === "SUCCEEDED" &&
          after.shipments.length === before.shipments.length + 1;
        checks.duplicateCompletionNoExtraRows =
          job.result?.shipmentIds?.length === 1;
        checks.frozenS3Version =
          typeof job.sourceVersion === "string" && job.sourceVersion.length > 0;
      } else {
        checks.invalidCsvFailsAtomically =
          job.state === "FAILED" &&
          after.shipments.length === before.shipments.length;
        checks.rowErrorVisible =
          job.errors?.some((e: string) => /row/i.test(e)) === true;
      }
    }
    checks.jobsListAvailable =
      (await request("/v1/jobs", token)).status === 200;
    return { checks, pass: Object.values(checks).every(Boolean) };
  } catch (error) {
    return { checks, pass: false, failure: (error as Error).message };
  }
}
