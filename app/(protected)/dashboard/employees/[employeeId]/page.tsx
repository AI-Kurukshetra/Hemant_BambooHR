import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canManageEmployees } from "@/lib/auth/employee-scope";
import { requirePagePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

import {
  addEmployeeJobAction,
  deleteEmployeeDocumentAction,
  updateEmployeeAction,
  updateOwnProfileAction,
} from "../actions";
import { UploadDocumentForm } from "./document-upload-form";

export const dynamic = "force-dynamic";

type EmployeeProfilePageProps = {
  params: Promise<{
    employeeId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  missing_required_fields: "Please fill all required fields.",
  employee_update_failed: "Could not update employee profile.",
  profile_update_failed: "Could not update your profile fields.",
  missing_job_fields: "Please fill all required job fields.",
  invalid_job_date: "Job effective date is invalid.",
  job_add_failed: "Could not add job history record.",
  missing_document_fields: "Document title and file are required.",
  document_upload_failed: "Could not upload document. Check storage setup and retry.",
  document_not_found: "Document was not found.",
  document_delete_failed: "Could not delete document.",
};

const successMessages: Record<string, string> = {
  employee_updated: "Employee profile updated.",
  profile_updated: "Your profile was updated.",
  job_added: "Job history updated.",
  document_uploaded: "Document uploaded successfully.",
  document_deleted: "Document deleted successfully.",
  employee_created: "Employee created successfully.",
};

function getFileNameFromStoragePath(storagePath: string) {
  const segments = storagePath.split("/");
  const rawName = segments[segments.length - 1] || "document";
  return rawName.replace(/^\d+_/, "");
}

function getFileIcon(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") {
    return "PDF";
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension || "")) {
    return "IMG";
  }
  if (["doc", "docx"].includes(extension || "")) {
    return "DOC";
  }
  if (["xls", "xlsx", "csv"].includes(extension || "")) {
    return "XLS";
  }
  return "FILE";
}

export default async function EmployeeProfilePage({
  params,
  searchParams,
}: EmployeeProfilePageProps) {
  const { employeeId } = await params;
  const query = await searchParams;
  const session = await requirePagePermission("employee:read");
  const canManage = canManageEmployees(session.roleKeys);

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: session.appUser!.companyId,
    },
    select: {
      id: true,
      employeeNumber: true,
      userId: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          preferredName: true,
          workEmail: true,
          personalEmail: true,
          phone: true,
          hireDate: true,
        },
      },
      jobs: {
        orderBy: {
          effectiveFrom: "desc",
        },
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
          employmentType: true,
          status: true,
          managerEmployeeId: true,
          effectiveFrom: true,
          effectiveTo: true,
          isCurrent: true,
          managerEmployeeRef: {
            select: {
              employeeNumber: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      documents: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          documentType: true,
          storagePath: true,
          createdAt: true,
        },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  const isSelf = employee.userId === session.authUser.id;
  if (!canManage && !isSelf) {
    redirect("/dashboard?error=forbidden");
  }

  const managerOptions = canManage
    ? await prisma.employee.findMany({
        where: {
          companyId: session.appUser!.companyId,
          id: {
            not: employee.id,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          employeeNumber: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })
    : [];

  const currentJob = employee.jobs.find((job) => job.isCurrent) || employee.jobs[0];
  const errorMessage = query.error ? errorMessages[query.error] : "";
  const successMessage = query.message ? successMessages[query.message] : "";

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Employee Profile</p>
            <h2 className="text-xl font-semibold text-slate-900">
              {employee.profile?.firstName} {employee.profile?.lastName}
            </h2>
            <p className="text-sm text-slate-600">Employee Number: {employee.employeeNumber}</p>
          </div>
          <Link
            href="/dashboard/employees"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Back to list
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {canManage ? (
        <form action={updateEmployeeAction} className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Core Profile (HR/Admin)</h3>
          <input type="hidden" name="employeeId" value={employee.id} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Employee Number*
              <input
                name="employeeNumber"
                defaultValue={employee.employeeNumber}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Work Email
              <input
                name="workEmail"
                defaultValue={employee.profile?.workEmail || ""}
                type="email"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              First Name*
              <input
                name="firstName"
                defaultValue={employee.profile?.firstName || ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Last Name*
              <input
                name="lastName"
                defaultValue={employee.profile?.lastName || ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Preferred Name
              <input
                name="preferredName"
                defaultValue={employee.profile?.preferredName || ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Personal Email
              <input
                name="personalEmail"
                type="email"
                defaultValue={employee.profile?.personalEmail || ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Phone
              <input
                name="phone"
                defaultValue={employee.profile?.phone || ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Save profile
          </button>
        </form>
      ) : (
        <form action={updateOwnProfileAction} className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">My Editable Fields</h3>
          <input type="hidden" name="employeeId" value={employee.id} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Preferred Name
              <input
                name="preferredName"
                defaultValue={employee.profile?.preferredName || ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Personal Email
              <input
                name="personalEmail"
                type="email"
                defaultValue={employee.profile?.personalEmail || ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Phone
              <input
                name="phone"
                defaultValue={employee.profile?.phone || ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Update my profile
          </button>
        </form>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Job History</h3>
          <ul className="mt-3 space-y-3">
            {employee.jobs.map((job) => (
              <li key={job.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">
                  {job.title} - {job.department} {job.isCurrent ? "(Current)" : ""}
                </p>
                <p className="text-slate-600">Status: {job.status}</p>
                <p className="text-slate-600">Employment Type: {job.employmentType}</p>
                <p className="text-slate-600">
                  Effective: {job.effectiveFrom.toISOString().slice(0, 10)}
                  {job.effectiveTo ? ` to ${job.effectiveTo.toISOString().slice(0, 10)}` : ""}
                </p>
                <p className="text-slate-600">
                  Manager: {job.managerEmployeeRef
                    ? `${job.managerEmployeeRef.employeeNumber} - ${job.managerEmployeeRef.profile?.firstName || ""} ${job.managerEmployeeRef.profile?.lastName || ""}`
                    : "None"}
                </p>
              </li>
            ))}
            {employee.jobs.length === 0 ? (
              <li className="text-sm text-slate-500">No job history available.</li>
            ) : null}
          </ul>
        </div>

        {canManage ? (
          <form action={addEmployeeJobAction} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Add Job Record</h3>
            <input type="hidden" name="employeeId" value={employee.id} />
            <div className="mt-4 grid gap-3">
              <label className="text-sm text-slate-700">
                Title*
                <input name="title" defaultValue={currentJob?.title || ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
              </label>
              <label className="text-sm text-slate-700">
                Department*
                <input name="department" defaultValue={currentJob?.department || ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
              </label>
              <label className="text-sm text-slate-700">
                Location
                <input name="location" defaultValue={currentJob?.location || ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm text-slate-700">
                Employment Type*
                <input
                  name="employmentType"
                  defaultValue={currentJob?.employmentType || "full_time"}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Status
                <select name="status" defaultValue={currentJob?.status || "active"} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="on_notice">on_notice</option>
                  <option value="terminated">terminated</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Manager
                <select name="managerEmployeeId" defaultValue={currentJob?.managerEmployeeId || ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                  <option value="">None</option>
                  {managerOptions.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.employeeNumber} - {manager.profile?.firstName} {manager.profile?.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Effective From*
                <input name="effectiveFrom" type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
              </label>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Add job history record
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
          <ul className="mt-3 space-y-3">
            {employee.documents.map((document) => (
              <li key={document.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-semibold text-slate-700">
                      {getFileIcon(getFileNameFromStoragePath(document.storagePath))}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{document.title}</p>
                      <p className="text-slate-600">
                        File: {getFileNameFromStoragePath(document.storagePath)}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-slate-600">About: {document.documentType}</p>
                <p className="text-slate-600">Added: {document.createdAt.toISOString().slice(0, 10)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={`/api/employees/${employee.id}/documents/${document.id}/download`}
                    className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                  >
                    Download
                  </a>
                  {canManage ? (
                    <form action={deleteEmployeeDocumentAction}>
                      <input type="hidden" name="employeeId" value={employee.id} />
                      <input type="hidden" name="documentId" value={document.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-rose-300 px-3 py-1.5 text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
            {employee.documents.length === 0 ? (
              <li className="text-sm text-slate-500">No documents uploaded yet.</li>
            ) : null}
          </ul>
        </div>

        <UploadDocumentForm employeeId={employee.id} />
      </div>
    </section>
  );
}
