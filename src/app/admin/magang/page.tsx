"use client";

import React, { useEffect, useRef, useState } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  showNotification,
  showConfirm,
} from "@/components/ui/NotificationProvider";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth/context";

import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  CalendarDays,
  Clock,
  Users,
  Award,
  FileText,
  ListChecks,
  Info,
  MapPin,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

import Link from "next/link";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const API_ENDPOINTS = {
  footer: `${API_BASE_URL}/footer`,
  program: `${API_BASE_URL}/program-magang`,
  informasi: `${API_BASE_URL}/informasi-pendaftaran`,
  benefit: `${API_BASE_URL}/benefit-program-magang`,
  timeline: `${API_BASE_URL}/timelane_kegiatan`,
  proses: `${API_BASE_URL}/proses-program-magang`,
};

interface FooterData {
  id?: number;
  alamat?: string;
  email?: string;
  telepon?: string;
  copyright?: string;
  deskripsi?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter_x?: string;
  jam_operasional?: string;
}

interface ProgramMagangData {
  id?: number;
  judul?: string;
  nama_program?: string;
  title?: string;

  deskripsi?: string;
  description?: string;

  durasi?: string;
  duration?: string;

  kategori?: string;
  tipe?: string;

  kuota?: string;
  status?: string;

  gambar?: string | null;
  gambar1?: string | null;
  gambar2?: string | null;
  gambar3?: string | null;
}

interface ProsesMagangData {
  id?: number;
  step?: number;
  langkah?: number;
  urutan?: number;

  judul?: string;
  title?: string;

  deskripsi?: string;
  description?: string;
}

interface BenefitMagangData {
  id?: number;

  judul?: string;
  title?: string;

  deskripsi?: string;
  description?: string;

  icon?: string;
}

interface TimelineKegiatanData {
  id?: number;

  kegiatan?: string;
  judul?: string;
  title?: string;

  tanggal?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;

  deskripsi?: string;
  description?: string;

  status?: string;
  urutan?: number;
}

interface InformasiPendaftaranData {
  id?: number;
  judul?: string;
  title?: string;
  deskripsi?: string;
  description?: string;
  syarat?: string;
  keterangan?: string;
  urutan?: number;
}

type ActiveTab =
  | "footer"
  | "program"
  | "proses"
  | "informasi"
  | "benefit"
  | "timeline";

type ModalType =
  | "program"
  | "proses"
  | "informasi"
  | "benefit"
  | "timeline"
  | null;

type ModalMode = "add" | "edit";

function parseApiResponse(json: any) {
  if (json?.data !== undefined) {
    return json.data;
  }

  if (json?.result !== undefined) {
    return json.result;
  }

  return json;
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return text ? { message: text } : {};
}

function notify(
  type: "success" | "error" | "warning" | "info",
  message: React.ReactNode,
  title?: string
) {
  showNotification({ type, message, title });
}

export default function LandingPageMagangPage() {
  const { user } = useAuth();

  const role = String(user?.role || "").toUpperCase();

  const isSuperAdmin =
    role === "SUPERADMIN" || role === "SUPER_ADMIN";

  const isAdminMagang = role === "ADMIN_MAGANG";

  const [activeTab, setActiveTab] =
    useState<ActiveTab>("program");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [footerData, setFooterData] = useState<FooterData>({
    alamat: "",
    email: "",
    telepon: "",
    copyright: "",
    deskripsi: "",
    instagram: "",
    linkedin: "",
    facebook: "",
    twitter_x: "",
    jam_operasional: "",
  });

  const [programList, setProgramList] = useState<
    ProgramMagangData[]
  >([]);

  const [prosesList, setProsesList] = useState<
    ProsesMagangData[]
  >([]);

  const [informasiList, setInformasiList] = useState<
    InformasiPendaftaranData[]
  >([]);

  const [benefitList, setBenefitList] = useState<
    BenefitMagangData[]
  >([]);

  const [timelineList, setTimelineList] = useState<
    TimelineKegiatanData[]
  >([]);

  const [modalType, setModalType] =
    useState<ModalType>(null);

  const [modalMode, setModalMode] =
    useState<ModalMode>("add");

  const [activeItem, setActiveItem] =
    useState<any>(null);

  const [gambarFiles, setGambarFiles] = useState<
    Array<File | null>
  >([null, null, null]);

  const [gambarPreviews, setGambarPreviews] = useState<
    Array<string | null>
  >([null, null, null]);

  const gambarInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const resetGambar = () => {
    setGambarFiles([null, null, null]);
    setGambarPreviews([null, null, null]);

    gambarInputRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.value = "";
      }
    });
  };

  useEffect(() => {
    if (modalType) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [modalType]);

  const fetchFooter = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_ENDPOINTS.footer, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const json = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          json?.message || "Gagal mengambil data footer"
        );
      }

      const data = parseApiResponse(json);

      if (Array.isArray(data)) {
        setFooterData(data[0] || {});
      } else {
        setFooterData(data || {});
      }
    } catch (error: any) {
      console.error("Fetch footer error:", error);

      notify(
        "error",
        error?.message || "Gagal mengambil data footer"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchProgramMagang = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_ENDPOINTS.program, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const json = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Gagal mengambil data program magang"
        );
      }

      const data = parseApiResponse(json);

      setProgramList(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : []
      );
    } catch (error: any) {
      console.error(
        "Fetch program magang error:",
        error
      );

      notify(
        "error",
        error?.message ||
          "Gagal mengambil data program magang"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchProsesProgramMagang = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_ENDPOINTS.proses, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const json = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Gagal mengambil data proses program magang"
        );
      }

      const data = parseApiResponse(json);

      setProsesList(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : []
      );
    } catch (error: any) {
      console.error(
        "Fetch proses program magang error:",
        error
      );

      notify(
        "error",
        error?.message ||
          "Gagal mengambil data proses program magang"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchInformasiPendaftaran = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_ENDPOINTS.informasi, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const json = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Gagal mengambil data informasi pendaftaran"
        );
      }

      const data = parseApiResponse(json);

      setInformasiList(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : []
      );
    } catch (error: any) {
      console.error(
        "Fetch informasi pendaftaran error:",
        error
      );

      notify(
        "error",
        error?.message ||
          "Gagal mengambil data informasi pendaftaran"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchBenefitProgramMagang = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        API_ENDPOINTS.benefit,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const json = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Gagal mengambil data benefit program magang"
        );
      }

      const data = parseApiResponse(json);

      setBenefitList(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : []
      );
    } catch (error: any) {
      console.error(
        "Fetch benefit error:",
        error
      );

      notify(
        "error",
        error?.message ||
          "Gagal mengambil data benefit"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineKegiatan = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        API_ENDPOINTS.timeline,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const json = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Gagal mengambil data timeline kegiatan"
        );
      }

      const data = parseApiResponse(json);

      setTimelineList(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : []
      );
    } catch (error: any) {
      console.error(
        "Fetch timeline error:",
        error
      );

      notify(
        "error",
        error?.message ||
          "Gagal mengambil data timeline"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "footer") {
      fetchFooter();
    }

    if (activeTab === "program") {
      fetchProgramMagang();
    }

    if (activeTab === "proses") {
      fetchProsesProgramMagang();
    }

    if (activeTab === "informasi") {
      fetchInformasiPendaftaran();
    }

    if (activeTab === "benefit") {
      fetchBenefitProgramMagang();
    }

    if (activeTab === "timeline") {
      fetchTimelineKegiatan();
    }
  }, [activeTab]);

  const handleSaveFooter = async () => {
    try {
      setSaving(true);

      const response = await fetch(
        API_ENDPOINTS.footer,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(footerData),
        }
      );

      const json = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          json?.message || "Gagal menyimpan footer"
        );
      }

      const data = parseApiResponse(json);

      if (data && typeof data === "object") {
        setFooterData(
          Array.isArray(data)
            ? data[0] || footerData
            : data
        );
      }

      notify(
        "success",
        "Data footer berhasil disimpan"
      );
    } catch (error: any) {
      console.error(
        "Save footer error:",
        error
      );

      notify(
        "error",
        error?.message ||
          "Gagal menyimpan data footer"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (type: ModalType) => {
    resetGambar();

    setModalType(type);
    setModalMode("add");

    if (type === "program") {
      setActiveItem({
        judul: "",
        deskripsi: "",
        durasi: "3 Bulan",
        kategori: "Fulltime",
        kuota: "Tersedia",
        status: "Aktif",
      });
    }

    if (type === "proses") {
      setActiveItem({
        step: prosesList.length + 1,
        urutan: prosesList.length + 1,
        judul: "",
        deskripsi: "",
      });
    }

    if (type === "informasi") {
      setActiveItem({
        urutan: informasiList.length + 1,
        judul: "",
        deskripsi: "",
        syarat: "",
        keterangan: "",
      });
    }

    if (type === "benefit") {
      setActiveItem({
        judul: "",
        deskripsi: "",
        icon: "Award",
      });
    }

    if (type === "timeline") {
      setActiveItem({
        kegiatan: "",
        tanggal: "",
        deskripsi: "",
        status: "Mendatang",
        urutan: timelineList.length + 1,
      });
    }
  };

  const handleEdit = (
    type: ModalType,
    item: any
  ) => {
    resetGambar();

    setModalType(type);
    setModalMode("edit");

    setActiveItem({
      ...item,
    });

    if (type === "program") {
      const images = [
        item?.gambar1 || item?.gambar || null,
        item?.gambar2 || null,
        item?.gambar3 || null,
      ];

      setGambarPreviews(images);
    }
  };

  const handleCloseModal = () => {
    if (saving) return;

    setModalType(null);
    setModalMode("add");
    setActiveItem(null);

    resetGambar();
  };

  const handleGambarChange = (
    index: number,
    file: File | null
  ) => {
    if (!file) return;

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      notify(
        "error",
        "Format gambar harus JPG, PNG, atau WebP"
      );

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify(
        "error",
        "Ukuran gambar maksimal 5 MB"
      );

      return;
    }

    const newFiles = [...gambarFiles];
    newFiles[index] = file;

    setGambarFiles(newFiles);

    const preview = URL.createObjectURL(file);

    const newPreviews = [...gambarPreviews];
    newPreviews[index] = preview;

    setGambarPreviews(newPreviews);

    const newItem = {
      ...activeItem,
    };

    if (index === 0) {
      newItem.gambar = undefined;
      newItem.gambar1 = undefined;
    }

    if (index === 1) {
      newItem.gambar2 = undefined;
    }

    if (index === 2) {
      newItem.gambar3 = undefined;
    }

    setActiveItem(newItem);
  };

  const handleRemoveGambar = (index: number) => {
    const newFiles = [...gambarFiles];
    newFiles[index] = null;

    setGambarFiles(newFiles);

    const newPreviews = [...gambarPreviews];
    newPreviews[index] = null;

    setGambarPreviews(newPreviews);

    const newItem = {
      ...activeItem,
    };

    if (index === 0) {
      newItem.gambar = null;
      newItem.gambar1 = null;
    }

    if (index === 1) {
      newItem.gambar2 = null;
    }

    if (index === 2) {
      newItem.gambar3 = null;
    }

    setActiveItem(newItem);

    if (gambarInputRefs[index].current) {
      gambarInputRefs[index].current!.value = "";
    }
  };

  const handleSubmitModal = async () => {
    if (!modalType || !activeItem) return;

    try {
      setSaving(true);

      let endpoint = "";

      if (modalType === "program") {
        endpoint = API_ENDPOINTS.program;
      }

      if (modalType === "proses") {
        endpoint = API_ENDPOINTS.proses;
      }

      if (modalType === "informasi") {
        endpoint = API_ENDPOINTS.informasi;
      }

      if (modalType === "benefit") {
        endpoint = API_ENDPOINTS.benefit;
      }

      if (modalType === "timeline") {
        endpoint = API_ENDPOINTS.timeline;
      }

      if (!endpoint) {
        throw new Error("Endpoint API tidak ditemukan");
      }

      const hasNewImages =
        modalType === "program" &&
        gambarFiles.some((file) => file !== null);

      let response: Response;

      if (hasNewImages) {
        const formData = new FormData();

        gambarFiles.forEach((file, index) => {
          if (file) {
            formData.append(
              `gambar${index + 1}`,
              file
            );
          }
        });

        Object.entries(activeItem).forEach(
          ([key, value]) => {
            if (
              key.startsWith("gambar") ||
              value === undefined ||
              value === null
            ) {
              return;
            }

            formData.append(
              key,
              String(value)
            );
          }
        );

        if (modalMode === "edit") {
          formData.append("_method", "PUT");
        }

        response = await fetch(endpoint, {
          method:
            modalMode === "edit"
              ? "POST"
              : "POST",
          headers: {
            Accept: "application/json",
          },
          body: formData,
        });
      } else {
        const payload = {
          ...activeItem,
        };

        if (modalMode === "edit") {
          response = await fetch(endpoint, {
            method: "PUT",
            headers: {
              Accept: "application/json",
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          });
        } else {
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(payload),
          });
        }
      }

      const json = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          json?.message ||
            `Gagal ${
              modalMode === "edit"
                ? "mengubah"
                : "menambahkan"
            } data`
        );
      }

      notify(
        "success",
        modalMode === "edit"
          ? "Data berhasil diperbarui"
          : "Data berhasil ditambahkan"
      );

      handleCloseModal();

      if (modalType === "program") {
        await fetchProgramMagang();
      }

      if (modalType === "proses") {
        await fetchProsesProgramMagang();
      }

      if (modalType === "informasi") {
        await fetchInformasiPendaftaran();
      }

      if (modalType === "benefit") {
        await fetchBenefitProgramMagang();
      }

      if (modalType === "timeline") {
        await fetchTimelineKegiatan();
      }
    } catch (error: any) {
      console.error(
        "Submit modal error:",
        error
      );

      notify(
        "error",
        error?.message ||
          "Terjadi kesalahan saat menyimpan data"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (
    type: ModalType,
    id?: number
  ) => {
    if (!id) {
      notify(
        "error",
        "ID data tidak ditemukan"
      );

      return;
    }

    showConfirm({
      title: "Hapus Data",
      message: "Apakah Anda yakin ingin menghapus data ini?",
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      confirmColor: "red",
      onConfirm: async () => {
        try {
          setLoading(true);

          let endpoint = "";

          if (type === "program") {
            endpoint = API_ENDPOINTS.program;
          }

          if (type === "proses") {
            endpoint = API_ENDPOINTS.proses;
          }

          if (type === "informasi") {
            endpoint = API_ENDPOINTS.informasi;
          }

          if (type === "benefit") {
            endpoint = API_ENDPOINTS.benefit;
          }

          if (type === "timeline") {
            endpoint = API_ENDPOINTS.timeline;
          }

          if (!endpoint) {
            throw new Error(
              "Endpoint delete tidak ditemukan"
            );
          }

          const response = await fetch(
            `${endpoint}?id=${encodeURIComponent(
              String(id)
            )}`,
            {
              method: "DELETE",
              headers: {
                Accept: "application/json",
              },
            }
          );

          const json = await parseResponse(response);

          if (!response.ok) {
            throw new Error(
              json?.message ||
                "Gagal menghapus data"
            );
          }

          notify(
            "success",
            "Data berhasil dihapus"
          );

          if (type === "program") {
            await fetchProgramMagang();
          }

          if (type === "proses") {
            await fetchProsesProgramMagang();
          }

          if (type === "informasi") {
            await fetchInformasiPendaftaran();
          }

          if (type === "benefit") {
            await fetchBenefitProgramMagang();
          }

          if (type === "timeline") {
            await fetchTimelineKegiatan();
          }
        } catch (error: any) {
          console.error(
            "Delete error:",
            error
          );

          notify(
            "error",
            error?.message ||
              "Gagal menghapus data"
          );
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const filteredProgramList =
    programList.filter((item) => {
      const keyword = searchTerm.toLowerCase();

      return (
        String(
          item.judul ||
            item.nama_program ||
            item.title ||
            ""
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          item.deskripsi ||
            item.description ||
            ""
        )
          .toLowerCase()
          .includes(keyword)
      );
    });

  const filteredProsesList =
    prosesList.filter((item) => {
      const keyword = searchTerm.toLowerCase();

      return (
        String(
          item.judul ||
            item.title ||
            ""
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          item.deskripsi ||
            item.description ||
            ""
        )
          .toLowerCase()
          .includes(keyword)
      );
    });

  const filteredInformasiList =
    informasiList.filter((item) => {
      const keyword = searchTerm.toLowerCase();

      return (
        String(
          item.judul ||
            item.title ||
            ""
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          item.deskripsi ||
            item.description ||
            item.syarat ||
            item.keterangan ||
            ""
        )
          .toLowerCase()
          .includes(keyword)
      );
    });

  const filteredBenefitList =
    benefitList.filter((item) => {
      const keyword = searchTerm.toLowerCase();

      return (
        String(
          item.judul ||
            item.title ||
            ""
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          item.deskripsi ||
            item.description ||
            ""
        )
          .toLowerCase()
          .includes(keyword)
      );
    });

  const filteredTimelineList =
    timelineList.filter((item) => {
      const keyword = searchTerm.toLowerCase();

      return (
        String(
          item.kegiatan ||
            item.judul ||
            item.title ||
            ""
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          item.deskripsi ||
            item.description ||
            ""
        )
          .toLowerCase()
          .includes(keyword)
      );
    });

  const renderBenefitIcon = (
    iconName?: string
  ) => {
    const icons: Record<
      string,
      React.ComponentType<any>
    > = {
      Award,
      Users,
      Clock,
      FileText,
      ListChecks,
      CheckCircle2,
      Globe,
    };

    const Icon =
      icons[iconName || "Award"] || Award;

    return <Icon className="w-5 h-5" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans text-foreground tracking-tight">
              Landing Page Magang
            </h1>

            <p className="text-xs md:text-sm text-muted-foreground font-sans font-semibold mt-1">
              Kelola konten landing page program
              magang.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-sans text-muted-foreground">
                  Program
                </p>

                <p className="text-[19px] font-sans mt-1">
                  {programList.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold font-sans text-muted-foreground">
                  Proses
                </p>

                <p className="text-[19px] font-sans mt-1">
                  {prosesList.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold font-sans text-muted-foreground">
                  Informasi
                </p>

                <p className="text-[19px] font-sans mt-1">
                  {informasiList.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold font-sans text-muted-foreground">
                  Benefit
                </p>

                <p className="text-[19px] font-sans mt-1">
                  {benefitList.length}
                </p>
              </div>

            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold font-sans uppercase text-muted-foreground">
                  Timeline
                </p>

                <p className="text-[19px] font-sans mt-1">
                  {timelineList.length}
                </p>
              </div>

            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="flex overflow-x-auto border-b border-border">
            {[
              {
                id: "program",
                label: "Program",
              },
              {
                id: "proses",
                label: "Proses",
              },
              {
                id: "informasi",
                label: "Informasi",
              },
              {
                id: "benefit",
                label: "Benefit",
              },
              {
                id: "timeline",
                label: "Timeline",
              },
              {
                id: "footer",
                label: "Footer",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.id as ActiveTab
                  )
                }
                className={`px-5 py-3 text-sm font-medium cursor-pointer font-sans whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab !== "footer" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder="Cari data"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
        )}

        {activeTab === "program" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  handleAdd("program")
                }
                className="inline-flex font-sans cursor-pointer items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                Tambah Program
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredProgramList.length ===
              0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <p className="text-sm font-sans text-muted-foreground">
                  Belum ada program magang.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredProgramList.map(
                  (item) => {
                    const title =
                      item.judul ||
                      item.nama_program ||
                      item.title ||
                      "Program Magang";

                    const description =
                      item.deskripsi ||
                      item.description ||
                      "";

                    const images = [
                      item.gambar1 ||
                        item.gambar ||
                        null,
                      item.gambar2 || null,
                      item.gambar3 || null,
                    ];

                    return (
                      <div
                        key={item.id}
                        className="bg-card border border-border rounded-lg overflow-hidden"
                      >
                        <div className="grid grid-cols-3 gap-1 h-48 bg-muted">
                          {images.map(
                            (
                              image,
                              index
                            ) =>
                              image ? (
                                <img
                                  key={index}
                                  src={image}
                                  alt={`${title} ${
                                    index + 1
                                  }`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  key={index}
                                  className="flex items-center justify-center bg-muted"
                                >
                                </div>
                              )
                          )}
                        </div>

                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold font-sans text-lg">
                                {title}
                              </h3>

                              <p className="text-sm font-sans text-muted-foreground mt-1 line-clamp-3">
                                {description}
                              </p>
                            </div>

                            <span className="px-2.5 py-1 font-sans rounded-full text-xs bg-primary/10 text-primary whitespace-nowrap">
                              {item.status ||
                                "Aktif"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="font-sans text-muted-foreground">
                                Durasi
                              </p>
                              <p className="font-sans mt-1">
                                {item.durasi ||
                                  item.duration ||
                                  "-"}
                              </p>
                            </div>

                            <div>
                              <p className=" font-sans text-muted-foreground">
                                Kategori
                              </p>
                              <p className="font-sans mt-1">
                                {item.kategori ||
                                  item.tipe ||
                                  "-"}
                              </p>
                            </div>

                            <div>
                              <p className="font-sans text-muted-foreground">
                                Kuota
                              </p>
                              <p className="font-sans mt-1">
                                {item.kuota ||
                                  "-"}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  "program",
                                  item
                                )
                              }
                              className="p-2
                              rounded-lg
                              text-primary
                              hover:bg-primary/10
                              active:scale-95
                              transition-all
                              cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  "program",
                                  item.id
                                )
                              }
                              className="p-2
                              rounded-lg
                              text-destructive
                              hover:bg-destructive/10
                              active:scale-95
                              transition-all
                              cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "proses" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  handleAdd("proses")
                }
                className="inline-flex items-center font-sans cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                Tambah Proses
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredProsesList.length ===
              0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <ListChecks className="w-10 h-10 mx-auto text-muted-foreground mb-3" />

                <p className="text-sm text-muted-foreground">
                  Belum ada data proses program.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProsesList.map(
                  (item, index) => {
                    const step =
                      item.step ||
                      item.langkah ||
                      item.urutan ||
                      index + 1;

                    const title =
                      item.judul ||
                      item.title ||
                      "";

                    const description =
                      item.deskripsi ||
                      item.description ||
                      "";

                    return (
                      <div
                        key={item.id}
                        className="relative bg-card border border-border rounded-lg p-5"
                      >
                        <div className="flex gap-4">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            {step}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold">
                                   {title}
                                </h3>

                                <p className="text-sm text-muted-foreground mt-1">
                                  {description}
                                </p>
                              </div>

                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(
                                      "proses",
                                      item
                                    )
                                  }
                                  className="p-2 rounded-lg hover:bg-muted"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      "proses",
                                      item.id
                                    )
                                  }
                                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================
            INFORMASI
            ================================================= */}

        {activeTab === "informasi" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  handleAdd("informasi")
                }
                className="inline-flex items-center font-sans cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                Tambah Informasi
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredInformasiList.length ===
              0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <Info className="w-10 h-10 mx-auto text-muted-foreground mb-3" />

                <p className="text-sm text-muted-foreground">
                  Belum ada data informasi pendaftaran.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInformasiList.map(
                  (item, index) => {
                    const number =
                      item.urutan ||
                      index + 1;

                    const title =
                      item.judul ||
                      item.title ||
                      "Informasi Pendaftaran";

                    const description =
                      item.deskripsi ||
                      item.description ||
                      "";

                    const syarat =
                      item.syarat ||
                      item.keterangan ||
                      "";

                    return (
                      <div
                        key={item.id}
                        className="relative bg-card border border-border rounded-lg p-5"
                      >
                        <div className="flex gap-4">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {number}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold">
                                  {title}
                                </h3>

                                {description && (
                                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                    {description}
                                  </p>
                                )}

                                {syarat && (
                                  <div className="mt-3 p-3 bg-muted/40 rounded-md border border-border/50 text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">Syarat/Keterangan:</span> {syarat}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(
                                      "informasi",
                                      item
                                    )
                                  }
                                  className="p-2 rounded-lg hover:bg-muted"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      "informasi",
                                      item.id
                                    )
                                  }
                                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================
            BENEFIT
            ================================================= */}

        {activeTab === "benefit" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  handleAdd("benefit")
                }
                className="inline-flex items-center font-sans cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                Tambah Benefit
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredBenefitList.length ===
              0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <Award className="w-10 h-10 mx-auto text-muted-foreground mb-3" />

                <p className="text-sm text-muted-foreground">
                  Belum ada benefit program.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBenefitList.map(
                  (item) => {
                    const title =
                      item.judul ||
                      item.title ||
                      "";

                    const description =
                      item.deskripsi ||
                      item.description ||
                      "";

                    return (
                      <div
                        key={item.id}
                        className="bg-card border border-border rounded-lg p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            {renderBenefitIcon(
                              item.icon
                            )}
                          </div>

                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  "benefit",
                                  item
                                )
                              }
                              className="p-2 rounded-lg hover:bg-muted"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  "benefit",
                                  item.id
                                )
                              }
                              className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-semibold mt-4">
                          {title}
                        </h3>

                        <p className="text-sm text-muted-foreground mt-2">
                          {description}
                        </p>

                        <p className="text-xs text-muted-foreground mt-4">
                          Icon:{" "}
                          <span className="font-medium">
                            {item.icon ||
                              "Award"}
                          </span>
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================
            TIMELINE
            ================================================= */}

        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  handleAdd("timeline")
                }
                className="inline-flex items-center font-sans cursor-pointer gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                Tambah Kegiatan
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredTimelineList.length ===
              0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground mb-3" />

                <p className="text-sm text-muted-foreground">
                  Belum ada timeline kegiatan.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTimelineList.map(
                  (item, index) => {
                    const title =
                      item.kegiatan ||
                      item.judul ||
                      item.title ||
                      "";

                    const description =
                      item.deskripsi ||
                      item.description ||
                      "";

                    const tanggal =
                      item.tanggal ||
                      item.tanggal_mulai ||
                      "";

                    return (
                      <div
                        key={item.id}
                        className="bg-card border border-border rounded-lg p-5"
                      >
                        <div className="flex gap-4">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <CalendarDays className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">
                                    {title}
                                  </h3>

                                  <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary">
                                    {item.status ||
                                      "Mendatang"}
                                  </span>
                                </div>

                                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  {tanggal || "-"}
                                </p>

                                <p className="text-sm text-muted-foreground mt-2">
                                  {description}
                                </p>
                              </div>

                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(
                                      "timeline",
                                      item
                                    )
                                  }
                                  className="p-2 rounded-lg hover:bg-muted"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      "timeline",
                                      item.id
                                    )
                                  }
                                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================
            FOOTER
            ================================================= */}

        {activeTab === "footer" && (
          <div className="bg-card border border-border rounded-lg p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Pengaturan Footer
                  </h2>

                  <p className="text-sm text-muted-foreground mt-1">
                    Kelola informasi footer landing
                    page.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Alamat
                    </label>

                    <textarea
                      value={
                        footerData.alamat || ""
                      }
                      onChange={(e) =>
                        setFooterData({
                          ...footerData,
                          alamat:
                            e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Deskripsi
                    </label>

                    <textarea
                      value={
                        footerData.deskripsi ||
                        ""
                      }
                      onChange={(e) =>
                        setFooterData({
                          ...footerData,
                          deskripsi:
                            e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>

                    <input
                      type="email"
                      value={
                        footerData.email || ""
                      }
                      onChange={(e) =>
                        setFooterData({
                          ...footerData,
                          email:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Telepon
                    </label>

                    <input
                      type="text"
                      value={
                        footerData.telepon ||
                        ""
                      }
                      onChange={(e) =>
                        setFooterData({
                          ...footerData,
                          telepon:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Jam Operasional
                    </label>

                    <input
                      type="text"
                      value={
                        footerData.jam_operasional ||
                        ""
                      }
                      onChange={(e) =>
                        setFooterData({
                          ...footerData,
                          jam_operasional:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Copyright
                    </label>

                    <input
                      type="text"
                      value={
                        footerData.copyright ||
                        ""
                      }
                      onChange={(e) =>
                        setFooterData({
                          ...footerData,
                          copyright:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">
                    Social Media
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Instagram
                      </label>

                      <input
                        type="url"
                        value={
                          footerData.instagram ||
                          ""
                        }
                        onChange={(e) =>
                          setFooterData({
                            ...footerData,
                            instagram:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        LinkedIn
                      </label>

                      <input
                        type="url"
                        value={
                          footerData.linkedin ||
                          ""
                        }
                        onChange={(e) =>
                          setFooterData({
                            ...footerData,
                            linkedin:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Facebook
                      </label>

                      <input
                        type="url"
                        value={
                          footerData.facebook ||
                          ""
                        }
                        onChange={(e) =>
                          setFooterData({
                            ...footerData,
                            facebook:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Twitter / X
                      </label>

                      <input
                        type="url"
                        value={
                          footerData.twitter_x ||
                          ""
                        }
                        onChange={(e) =>
                          setFooterData({
                            ...footerData,
                            twitter_x:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleSaveFooter}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? (
                      <Spinner size="sm" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}

                    {saving
                      ? "Menyimpan..."
                      : "Simpan Footer"}
                  </button>
                </div>

                <div className="rounded-lg bg-muted/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground">
                    Data dikirim langsung ke API
                    Laravel:
                  </p>

                  <p className="text-xs font-mono mt-1 break-all">
                    {API_ENDPOINTS.footer}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================
            MODAL
            ================================================= */}

        {modalType && activeItem && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-card border border-border rounded-lg shadow-elevated w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 max-h-[calc(100vh-2rem)] overflow-y-auto">
                {/* HEADER */}

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {modalMode === "add"
                        ? "Tambah"
                        : "Edit"}{" "}
                      {modalType ===
                      "program"
                        ? "Program Magang"
                        : modalType ===
                          "proses"
                        ? "Proses Program Magang"
                        : modalType ===
                          "informasi"
                        ? "Informasi Pendaftaran"
                        : modalType ===
                          "benefit"
                        ? "Benefit Program"
                        : "Timeline Kegiatan"}
                    </h2>

                    <p className="text-sm text-muted-foreground mt-1">
                      Isi data dengan lengkap.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleCloseModal
                    }
                    disabled={saving}
                    className="p-2 rounded-lg hover:bg-muted"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* =================================================
                    PROGRAM FORM
                    ================================================= */}

                {modalType ===
                  "program" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Judul Program
                      </label>

                      <input
                        type="text"
                        value={
                          activeItem.judul ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            judul:
                              e.target
                                .value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Deskripsi Program
                      </label>

                      <textarea
                        value={
                          activeItem.deskripsi ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            deskripsi:
                              e.target
                                .value,
                          })
                        }
                        rows={4}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Durasi
                        </label>

                        <input
                          type="text"
                          value={
                            activeItem.durasi ||
                            ""
                          }
                          onChange={(e) =>
                            setActiveItem({
                              ...activeItem,
                              durasi:
                                e.target
                                  .value,
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Tipe / Kategori
                        </label>

                        <input
                          type="text"
                          value={
                            activeItem.kategori ||
                            ""
                          }
                          onChange={(e) =>
                            setActiveItem({
                              ...activeItem,
                              kategori:
                                e.target
                                  .value,
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Kuota / Status
                        </label>

                        <input
                          type="text"
                          value={
                            activeItem.kuota ||
                            ""
                          }
                          onChange={(e) =>
                            setActiveItem({
                              ...activeItem,
                              kuota:
                                e.target
                                  .value,
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Status Aktif
                        </label>

                        <select
                          value={
                            activeItem.status ||
                            "Aktif"
                          }
                          onChange={(e) =>
                            setActiveItem({
                              ...activeItem,
                              status:
                                e.target
                                  .value,
                            })
                          }
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        >
                          <option value="Aktif">
                            Aktif
                          </option>

                          <option value="Nonaktif">
                            Nonaktif
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* IMAGE */}

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Foto Program
                      </label>

                      <p className="text-xs text-muted-foreground mb-3">
                        Maksimal 3 gambar.
                        JPG, PNG, WebP.
                        Maksimal 5 MB per
                        gambar.
                      </p>

                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map(
                          (index) => (
                            <div
                              key={index}
                              className="relative"
                            >
                              <input
                                ref={
                                  gambarInputRefs[
                                    index
                                  ]
                                }
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(
                                  e
                                ) =>
                                  handleGambarChange(
                                    index,
                                    e.target
                                      .files?.[0] ||
                                      null
                                  )
                                }
                              />

                              {gambarPreviews[
                                index
                              ] ? (
                                <div className="relative aspect-square rounded-lg overflow-hidden border border-border">
                                  <img
                                    src={
                                      gambarPreviews[
                                        index
                                      ] || ""
                                    }
                                    alt={`Preview ${
                                      index +
                                      1
                                    }`}
                                    className="w-full h-full object-cover"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveGambar(
                                        index
                                      )
                                    }
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    gambarInputRefs[
                                      index
                                    ].current?.click()
                                  }
                                  className="w-full aspect-square rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted"
                                >
                                  <Upload className="w-5 h-5 text-muted-foreground" />

                                  <span className="text-xs text-muted-foreground">
                                    Gambar{" "}
                                    {index +
                                      1}
                                  </span>
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* =================================================
                    PROSES FORM
                    ================================================= */}

                {modalType ===
                  "proses" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Langkah Ke-
                      </label>

                      <input
                        type="number"
                        value={
                          activeItem.step ||
                          activeItem.urutan ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            step: Number(
                              e.target
                                .value
                            ),
                            urutan: Number(
                              e.target
                                .value
                            ),
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Judul Tahapan
                      </label>

                      <input
                        type="text"
                        value={
                          activeItem.judul ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            judul:
                              e.target
                                .value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Penjelasan / Deskripsi
                      </label>

                      <textarea
                        value={
                          activeItem.deskripsi ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            deskripsi:
                              e.target
                                .value,
                          })
                        }
                        rows={5}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {/* =================================================
                    INFORMASI FORM
                    ================================================= */}

                {modalType ===
                  "informasi" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nomor Urutan
                      </label>

                      <input
                        type="number"
                        value={
                          activeItem.urutan ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            urutan: Number(
                              e.target
                                .value
                            ),
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Judul Informasi
                      </label>

                      <input
                        type="text"
                        value={
                          activeItem.judul ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            judul:
                              e.target
                                .value,
                          })
                        }
                        placeholder="Contoh: Persyaratan Berkas Pendaftaran"
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Deskripsi / Informasi Detail
                      </label>

                      <textarea
                        value={
                          activeItem.deskripsi ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            deskripsi:
                              e.target
                                .value,
                          })
                        }
                        rows={5}
                        placeholder="Masukkan detail informasi pendaftaran..."
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Syarat / Keterangan Tambahan (Opsional)
                      </label>

                      <input
                        type="text"
                        value={
                          activeItem.syarat ||
                          activeItem.keterangan ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            syarat:
                              e.target
                                .value,
                            keterangan:
                              e.target
                                .value,
                          })
                        }
                        placeholder="Contoh: Format PDF maksimal 2 MB"
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {/* =================================================
                    BENEFIT FORM
                    ================================================= */}

                {modalType ===
                  "benefit" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Judul Keuntungan /
                        Benefit
                      </label>

                      <input
                        type="text"
                        value={
                          activeItem.judul ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            judul:
                              e.target
                                .value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Deskripsi Benefit
                      </label>

                      <textarea
                        value={
                          activeItem.deskripsi ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            deskripsi:
                              e.target
                                .value,
                          })
                        }
                        rows={5}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Kode Icon / Simbol
                      </label>

                      <input
                        type="text"
                        value={
                          activeItem.icon ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            icon:
                              e.target
                                .value,
                          })
                        }
                        placeholder="Contoh: Award"
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />

                      <p className="text-xs text-muted-foreground mt-2">
                        Contoh: Award,
                        Users, Clock,
                        FileText,
                        ListChecks
                      </p>
                    </div>
                  </div>
                )}

                {/* =================================================
                    TIMELINE FORM
                    ================================================= */}

                {modalType ===
                  "timeline" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nama Kegiatan /
                        Agenda
                      </label>

                      <input
                        type="text"
                        value={
                          activeItem.kegiatan ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            kegiatan:
                              e.target
                                .value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tanggal / Rentang
                        Waktu
                      </label>

                      <input
                        type="text"
                        value={
                          activeItem.tanggal ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            tanggal:
                              e.target
                                .value,
                          })
                        }
                        placeholder="Contoh: 1 - 5 Oktober 2026"
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Status Kegiatan
                      </label>

                      <select
                        value={
                          activeItem.status ||
                          "Mendatang"
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            status:
                              e.target
                                .value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      >
                        <option value="Mendatang">
                          Mendatang
                        </option>

                        <option value="Berlangsung">
                          Berlangsung
                        </option>

                        <option value="Selesai">
                          Selesai
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Keterangan /
                        Deskripsi
                      </label>

                      <textarea
                        value={
                          activeItem.deskripsi ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            deskripsi:
                              e.target
                                .value,
                          })
                        }
                        rows={5}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Urutan
                      </label>

                      <input
                        type="number"
                        value={
                          activeItem.urutan ||
                          ""
                        }
                        onChange={(e) =>
                          setActiveItem({
                            ...activeItem,
                            urutan: Number(
                              e.target
                                .value
                            ),
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {/* =================================================
                    MODAL FOOTER
                    ================================================= */}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={
                      handleCloseModal
                    }
                    disabled={saving}
                    className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleSubmitModal
                    }
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? (
                      <Spinner size="sm" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}

                    {saving
                      ? "Menyimpan..."
                      : modalMode ===
                        "edit"
                      ? "Simpan Perubahan"
                      : "Tambah Data"}
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}
      </div>
    </DashboardLayout>
  );
}