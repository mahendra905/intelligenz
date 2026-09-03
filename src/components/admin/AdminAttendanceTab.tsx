import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  Trash2,
  Users,
  Calendar,
  RefreshCw,
  Clock,
  ScanLine,
  UserCheck,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  X,
  Check,
  Filter,
  UserX,
  Sparkles,
  Upload,
  ExternalLink,
} from 'lucide-react';
import jsQR from 'jsqr';
import { api, authStorage } from '../../lib/api';
import {
  AttendanceRecord,
  AttendanceVerificationResult,
  AttendanceRosterItem,
  Event,
} from '../../types';

interface AdminAttendanceTabProps {
  onRefreshData?: () => void;
}

// Audio tone synthesizer using standard browser Web Audio API
function playAttendanceTone(type: 'success' | 'warning' | 'error', isMuted: boolean) {
  if (isMuted || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.09); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.setValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.36);
    }
  } catch {
    // Ignored if browser blocks audio autoplay
  }
}

export function AdminAttendanceTab({ onRefreshData }: AdminAttendanceTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [checkins, setCheckins] = useState<AttendanceRecord[]>([]);
  const [roster, setRoster] = useState<AttendanceRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check-in input & fast mode
  const [checkinInput, setCheckinInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fastMode, setFastMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active Verification Card / Modal
  const [verificationResult, setVerificationResult] = useState<AttendanceVerificationResult | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    details?: any;
  } | null>(null);

  // Roster view filters
  const [rosterTab, setRosterTab] = useState<'all' | 'present' | 'pending'>('present');
  const [searchQuery, setSearchQuery] = useState('');

  // Camera QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  // Input ref for auto-focus
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus helper
  const focusScanInput = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 150);
  }, []);

  // Fetch all initial data
  const loadDataForEvent = useCallback(
    async (eventId: string, isManualRefresh = false) => {
      if (!authStorage.isAuthenticated()) return;
      if (isManualRefresh) setRefreshing(true);

      try {
        const [eventsData, checkinsData, rosterData] = await Promise.all([
          api.getEvents().catch(() => []),
          api.adminGetCheckins(eventId || undefined).catch(() => []),
          api.adminGetAttendanceRoster(eventId || undefined).catch(() => null),
        ]);

        setEvents(eventsData || []);
        setCheckins(checkinsData || []);

        if (rosterData && rosterData.roster) {
          setRoster(rosterData.roster);
        } else {
          setRoster([]);
        }
      } catch (err) {
        console.error('Failed to load attendance roster data:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      try {
        const eventsData = await api.getEvents().catch(() => []);
        if (isMounted) {
          setEvents(eventsData || []);
          const defaultEventId = eventsData.length > 0 ? eventsData[0].id : '';
          setSelectedEventId(defaultEventId);
          await loadDataForEvent(defaultEventId);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, [loadDataForEvent]);

  // When selected event changes, reset inputs, clear previous states, and load fresh data
  const handleEventChange = async (newEventId: string) => {
    setSelectedEventId(newEventId);
    setVerificationResult(null);
    setActiveFeedback(null);
    setCheckinInput('');
    await loadDataForEvent(newEventId, true);
    focusScanInput();
  };

  // Reload current event data
  const handleManualReload = async () => {
    await loadDataForEvent(selectedEventId, true);
    onRefreshData?.();
    focusScanInput();
  };

  // Execute checkin directly (used by Fast Mode or when user clicks Confirm in modal)
  const executeCheckin = async (codeToSubmit: string, method = 'Rapid Scanner') => {
    const cleanCode = codeToSubmit.trim();
    if (!cleanCode) return;

    setIsProcessing(true);
    setVerificationResult(null);

    try {
      const response = await api.adminCheckinParticipant({
        code: cleanCode,
        event_id: selectedEventId || undefined,
        method: method,
      });

      // Play success audio chime
      playAttendanceTone('success', !soundEnabled);

      setActiveFeedback({
        type: 'success',
        title: 'Check-In Verified & Recorded!',
        message: response.message,
        details: {
          participant: response.participant,
          record: response.record,
          ticket_code: response.ticket_code,
        },
      });

      setCheckinInput('');
      // Reload checkins and roster
      await loadDataForEvent(selectedEventId);
      onRefreshData?.();
    } catch (err: any) {
      const status = err.status || err.details?.status;
      const details = err.details || {};

      if (status === 'already_checked_in') {
        playAttendanceTone('warning', !soundEnabled);
        setActiveFeedback({
          type: 'warning',
          title: 'Already Checked In',
          message: err.message || 'This participant has already checked in to this event.',
          details: {
            record: details.record,
            participant: details.participant,
          },
        });
      } else if (status === 'wrong_event') {
        playAttendanceTone('error', !soundEnabled);
        setActiveFeedback({
          type: 'error',
          title: 'Wrong Event Detected',
          message: `This participant is registered for: "${details.registered_event_title || 'Another Event'}", but current event is: "${details.selected_event_title || 'Selected Event'}". Attendance was NOT recorded.`,
          details,
        });
      } else if (status === 'not_eligible') {
        playAttendanceTone('error', !soundEnabled);
        setActiveFeedback({
          type: 'error',
          title: 'Registration Not Eligible',
          message: err.message || 'This registration is cancelled or waitlisted and cannot be checked in.',
          details,
        });
      } else {
        playAttendanceTone('error', !soundEnabled);
        setActiveFeedback({
          type: 'error',
          title: 'Registration Not Found',
          message: err.message || 'No valid event registration was found for this ticket/roll number.',
          details,
        });
      }
    } finally {
      setIsProcessing(false);
      focusScanInput();
    }
  };

  // Verify first (or directly check in if Fast Mode is on)
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = checkinInput.trim();
    if (!query || isProcessing) return;

    // In Fast Check-in Mode: skip confirmation card and record check-in immediately
    if (fastMode) {
      await executeCheckin(query, 'Rapid Scanner');
      return;
    }

    // In Manual Confirmation Mode: verify first, display card, then wait for admin confirmation
    setIsProcessing(true);
    setActiveFeedback(null);
    setVerificationResult(null);

    try {
      const result = await api.adminVerifyAttendance({
        code: query,
        event_id: selectedEventId || undefined,
      });

      if (result.status === 'eligible') {
        playAttendanceTone('success', !soundEnabled);
        setVerificationResult(result);
      } else if (result.status === 'already_checked_in') {
        playAttendanceTone('warning', !soundEnabled);
        setVerificationResult(result);
        setActiveFeedback({
          type: 'warning',
          title: 'Already Checked In',
          message: result.error || 'Participant is already marked present.',
          details: result,
        });
      } else if (result.status === 'wrong_event') {
        playAttendanceTone('error', !soundEnabled);
        setVerificationResult(result);
        setActiveFeedback({
          type: 'error',
          title: 'Wrong Event Detected',
          message: `Participant is registered for "${result.registered_event_title}", not "${result.selected_event_title}". Attendance was NOT recorded.`,
          details: result,
        });
      } else if (result.status === 'not_eligible') {
        playAttendanceTone('error', !soundEnabled);
        setVerificationResult(result);
        setActiveFeedback({
          type: 'error',
          title: 'Registration Not Eligible',
          message: result.error || 'Registration is cancelled or waitlisted.',
          details: result,
        });
      } else {
        playAttendanceTone('error', !soundEnabled);
        setActiveFeedback({
          type: 'error',
          title: 'Registration Not Found',
          message: result.error || 'No valid registration found for this ticket/roll number.',
        });
      }
    } catch (err: any) {
      playAttendanceTone('error', !soundEnabled);
      setActiveFeedback({
        type: 'error',
        title: 'Verification Failed',
        message: err.message || 'Could not verify ticket. Check connection or try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm check-in button clicked on verification card
  const handleConfirmVerification = async () => {
    if (!verificationResult || verificationResult.status !== 'eligible') return;
    const code = verificationResult.ticket_code || verificationResult.participant?.roll_number || checkinInput;
    await executeCheckin(code, 'Admin Terminal');
  };

  // Delete check-in record
  const handleDeleteCheckin = async (id: string, participantName: string) => {
    if (!window.confirm(`Are you sure you want to remove the check-in record for "${participantName}"? This will mark the participant as absent.`)) {
      return;
    }

    try {
      await api.adminDeleteCheckin(id);
      setCheckins((prev) => prev.filter((c) => c.id !== id));
      await loadDataForEvent(selectedEventId);
      onRefreshData?.();
    } catch (err) {
      console.error('Failed to delete checkin record:', err);
    }
  };

  // 1-Click Check-in from roster table
  const handleQuickCheckinFromRoster = async (item: AttendanceRosterItem) => {
    await executeCheckin(item.roll_number || item.ticket_code, 'Roster Action');
  };

  // ==========================================
  // CAMERA QR SCANNER ENGINE
  // ==========================================
  const stopCameraScanner = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCameraScanner = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Camera access is not supported by your current browser or connection (HTTPS required).'
        );
        return;
      }

      let stream: MediaStream | null = null;
      try {
        // Try environment-facing (rear) camera first for easy mobile QR scanning
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (firstErr: any) {
        // If permission was specifically denied, do not retry and throw immediately
        if (firstErr?.name === 'NotAllowedError' || firstErr?.name === 'PermissionDeniedError') {
          throw firstErr;
        }
        // If overconstrained or device facingMode not found (e.g. desktop webcam), fall back to default video
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch {
          throw firstErr;
        }
      }

      if (!stream) {
        throw new Error('Unable to initialize video stream from camera device.');
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access unavailable or denied:', err?.message || err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission denied') ||
        err?.message?.toLowerCase().includes('not allowed');

      if (isPermissionDenied) {
        setCameraError(
          'Camera permission was blocked. Please allow camera access in your browser, or open in a new tab. You can also scan ticket files using "Scan QR File" or enter Roll Numbers manually below.'
        );
      } else {
        setCameraError(
          err?.message || 'Camera is currently unavailable. You can enter the Roll Number or upload a ticket image.'
        );
      }
      setIsCameraActive(false);
    }
  };

  // Scan loop using hidden canvas + jsQR
  useEffect(() => {
    if (!isCameraActive) return;

    let isScanning = true;

    const tick = () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            const rawData = code.data.trim();
            const now = Date.now();
            // Debounce: prevent repeatedly firing for the same code within 3 seconds
            if (rawData !== lastScannedCodeRef.current || now - lastScanTimestampRef.current > 3000) {
              lastScannedCodeRef.current = rawData;
              lastScanTimestampRef.current = now;
              setCheckinInput(rawData);

              if (fastMode) {
                executeCheckin(rawData, 'QR Code');
              } else {
                // Trigger manual verification
                api
                  .adminVerifyAttendance({
                    code: rawData,
                    event_id: selectedEventId || undefined,
                  })
                  .then((res) => {
                    if (res.status === 'eligible') {
                      playAttendanceTone('success', !soundEnabled);
                    } else {
                      playAttendanceTone('warning', !soundEnabled);
                    }
                    setVerificationResult(res);
                  })
                  .catch((err) => {
                    playAttendanceTone('error', !soundEnabled);
                    setActiveFeedback({
                      type: 'error',
                      title: 'Scan Error',
                      message: err.message || 'Verification failed',
                    });
                  });
              }
            }
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(tick);
    };

    scanLoopRef.current = requestAnimationFrame(tick);

    return () => {
      isScanning = false;
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
    };
  }, [isCameraActive, fastMode, selectedEventId, soundEnabled]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [stopCameraScanner]);

  // Handle uploaded QR image file
  const handleFileUploadQR = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            setCheckinInput(code.data.trim());
            if (fastMode) {
              executeCheckin(code.data.trim(), 'QR Code Upload');
            } else {
              setCheckinInput(code.data.trim());
            }
          } else {
            setActiveFeedback({
              type: 'error',
              title: 'No QR Code Detected',
              message: 'Could not detect a valid QR code in the uploaded image. Please try another image.',
            });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // STATS CALCULATIONS (Safe, live, synchronized)
  // ==========================================
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Total registered participants for current event filter
  const totalRegisteredCount = roster.length;
  const checkedInCount = roster.filter((r) => r.checked_in).length;
  const remainingCount = Math.max(0, totalRegisteredCount - checkedInCount);
  const attendanceRate =
    totalRegisteredCount > 0 ? Math.round((checkedInCount / totalRegisteredCount) * 100) : 0;

  // Filtered roster according to search and active tab
  const filteredRoster = roster.filter((item) => {
    // Tab filter
    if (rosterTab === 'present' && !item.checked_in) return false;
    if (rosterTab === 'pending' && item.checked_in) return false;

    // Search filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.participant_name || '').toLowerCase().includes(q) ||
      (item.roll_number || '').toLowerCase().includes(q) ||
      (item.ticket_code || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q) ||
      (item.department || '').toLowerCase().includes(q)
    );
  });

  // Export Comprehensive Attendance Roster CSV
  const exportFullRosterCSV = () => {
    const headers = [
      'Event Title',
      'Participant Name',
      'Roll Number',
      'Ticket Code',
      'Email',
      'Department',
      'Year',
      'Registration Status',
      'Attendance Status',
      'Check-in Date & Time',
      'Check-in Method',
    ];

    const rows = roster.map((item) => [
      `"${selectedEvent?.title || 'All Events'}"`,
      `"${item.participant_name}"`,
      `"${item.roll_number}"`,
      `"${item.ticket_code}"`,
      `"${item.email}"`,
      `"${item.department}"`,
      `"${item.year}"`,
      `"${item.registration_status}"`,
      `"${item.checked_in ? 'PRESENT' : 'ABSENT'}"`,
      `"${item.checked_in_at ? new Date(item.checked_in_at).toLocaleString() : 'N/A'}"`,
      `"${item.checkin_method || 'N/A'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `attendance_roster_${selectedEvent ? selectedEvent.slug || selectedEvent.id : 'all'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Hidden canvas for QR image decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-cyan-400" />
            Event Check-In & Live Attendance Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Production-grade registration verification terminal, live duplicate protection & rapid check-in station.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-slate-800 border-cyan-500/30 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Chime sound is ON' : 'Chime sound is MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Audio Chime ON' : 'Muted'}</span>
          </button>

          {/* Export Roster */}
          <button
            type="button"
            onClick={exportFullRosterCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export Attendance Roster
          </button>

          {/* Reload button */}
          <button
            type="button"
            onClick={handleManualReload}
            disabled={refreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors border border-slate-700"
            title="Refresh attendance records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Event Selector & Live Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Active Event Selector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:col-span-1 space-y-2 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-mono uppercase text-cyan-400 font-bold tracking-wider mb-1">
              Select Active Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => handleEventChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.date})
                </option>
              ))}
            </select>
          </div>

          {selectedEvent ? (
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-0.5">
              <p className="flex items-center gap-1 truncate">
                <span className="text-slate-500">Venue:</span>{' '}
                <span className="text-slate-300 font-medium truncate">{selectedEvent.venue}</span>
              </p>
              <p className="flex items-center gap-1">
                <span className="text-slate-500">Date:</span>{' '}
                <span className="text-slate-300 font-medium">
                  {selectedEvent.date} {selectedEvent.start_time ? `• ${selectedEvent.start_time}` : ''}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">Choose an event to manage check-ins</p>
          )}
        </div>

        {/* Total Registered */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Registered Participants</p>
            <h3 className="text-2xl font-black text-white mt-1 font-mono">{totalRegisteredCount}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Source of truth: registrations</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Checked-In (Attended) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Checked-In (Attended)</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{checkedInCount}</h3>
            <p className="text-[10px] text-emerald-400/80 mt-0.5 font-mono">
              Attendance Rate: <span className="font-bold">{attendanceRate}%</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Remaining (Unchecked) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Remaining to Check-in</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1 font-mono">{remainingCount}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {totalRegisteredCount > 0 ? `${Math.round((remainingCount / totalRegisteredCount) * 100)}% pending` : 'No participants'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Rapid Scan & Check-In Station */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <ScanLine className="w-4 h-4 animate-pulse text-cyan-400" />
            Rapid Scan & Verification Station
          </div>

          {/* Station Mode Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Fast Check-In Mode Toggle */}
            <button
              type="button"
              onClick={() => setFastMode(!fastMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                fastMode
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Fast Mode automatically marks verified participants present without extra clicks"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fast Check-in Mode: <strong>{fastMode ? 'ON (Auto-Confirm)' : 'OFF (Manual Review)'}</strong></span>
            </button>

            {/* Camera Scanner Toggle */}
            <button
              type="button"
              onClick={isCameraActive ? stopCameraScanner : startCameraScanner}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                isCameraActive
                  ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isCameraActive ? <CameraOff className="w-3.5 h-3.5 text-red-400" /> : <Camera className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isCameraActive ? 'Close Camera Scanner' : 'Open Camera Scanner'}</span>
            </button>

            {/* Upload QR Image */}
            <label className="cursor-pointer px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Scan QR File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUploadQR}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Live Camera Scanner Viewport */}
        {isCameraActive && (
          <div className="relative rounded-xl overflow-hidden border-2 border-cyan-400/50 bg-black max-w-md mx-auto aspect-video sm:aspect-[4/3] flex items-center justify-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-cyan-400/80 rounded-2xl relative">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-cyan-300 rounded-tl"></div>
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-cyan-300 rounded-tr"></div>
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-cyan-300 rounded-bl"></div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-cyan-300 rounded-br"></div>

                {/* Animated laser scanline */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-bounce"></div>
              </div>
            </div>

            <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
              <span className="bg-black/80 text-cyan-300 text-[11px] font-mono px-3 py-1 rounded-full border border-cyan-500/30 backdrop-blur-sm">
                Align QR Code inside the square
              </span>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="p-4 bg-red-950/70 border border-red-500/50 rounded-xl text-xs text-red-200 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-300">Camera Access Notice</p>
                  <p className="text-red-200/90 leading-relaxed">{cameraError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCameraError(null)}
                className="p-1 text-red-400 hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 border-t border-red-900/60 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startCameraScanner}
                className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800/80 text-red-200 border border-red-700/60 rounded-md font-medium text-[11px] transition-colors"
              >
                Retry Camera
              </button>
              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-700/60 rounded-md font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in New Tab (Bypasses iframe camera restrictions)</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={checkinInput}
              onChange={(e) => setCheckinInput(e.target.value)}
              placeholder="Scan QR / Enter Ticket Code (TKT-xxx) or Student Roll Number (e.g. 22K61A4201)..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-3 pl-11 pr-10 text-sm font-mono text-white placeholder-slate-500 transition-colors"
            />
            <QrCode className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            {checkinInput && (
              <button
                type="button"
                onClick={() => {
                  setCheckinInput('');
                  focusScanInput();
                }}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isProcessing || !checkinInput.trim()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 flex-shrink-0"
          >
            {isProcessing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {fastMode ? 'Verify & Fast Check-In' : 'Verify Registration'}
          </button>
        </form>

        {/* Confirmation Card (When Manual Review Mode is Active and Registration is Verified) */}
        {verificationResult && verificationResult.status === 'eligible' && (
          <div className="bg-slate-950 border-2 border-emerald-500/60 rounded-xl p-4 sm:p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold uppercase">
                  ✓ REGISTRATION VERIFIED
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Ticket: <strong className="text-white">{verificationResult.ticket_code}</strong>
                </span>
              </div>
              <button
                onClick={() => setVerificationResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Participant Name</span>
                <span className="text-sm font-sans font-bold text-white block mt-0.5">
                  {verificationResult.participant?.name}
                </span>
                {verificationResult.participant?.is_leader ? (
                  <span className="text-[10px] text-cyan-400">Team Leader / Solo</span>
                ) : (
                  <span className="text-[10px] text-slate-400">Team Member</span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Roll Number</span>
                <span className="text-sm font-mono font-bold text-cyan-300 block mt-0.5">
                  {verificationResult.participant?.roll_number}
                </span>
                <span className="text-[10px] text-slate-400">
                  {verificationResult.participant?.department || 'CSE (AIML)'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Event Verified</span>
                <span className="text-xs text-slate-200 block mt-0.5 font-sans font-medium line-clamp-1" title={verificationResult.event?.title}>
                  {verificationResult.event?.title}
                </span>
                <span className="text-[10px] text-slate-400">
                  Venue: {verificationResult.event?.venue}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Registration Status</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                  {verificationResult.registration?.status || 'Confirmed'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setVerificationResult(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVerification}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>CONFIRM CHECK-IN (MARK PRESENT)</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback Message Banner (Success, Already Checked In, Wrong Event, Not Found) */}
        {activeFeedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-start justify-between gap-3 animate-in fade-in duration-200 ${
              activeFeedback.type === 'success'
                ? 'bg-emerald-950/70 border-2 border-emerald-500/50 text-emerald-200'
                : activeFeedback.type === 'warning'
                ? 'bg-amber-950/70 border-2 border-amber-500/50 text-amber-200'
                : 'bg-red-950/70 border-2 border-red-500/50 text-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {activeFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : activeFeedback.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold text-sm">{activeFeedback.title}</p>
                <p className="text-xs leading-relaxed">{activeFeedback.message}</p>
                {activeFeedback.details?.record && (
                  <p className="text-[11px] text-slate-300 font-mono mt-1 pt-1 border-t border-slate-800">
                    Already checked in at:{' '}
                    <span className="text-white font-bold">
                      {new Date(activeFeedback.details.record.checked_in_at).toLocaleTimeString()}
                    </span>{' '}
                    via {activeFeedback.details.record.checkin_method || 'Scanner'}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveFeedback(null)}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Attendance Roster Management & Attendee Log */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setRosterTab('present')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                rosterTab === 'present'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Checked-In ({checkedInCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRosterTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                rosterTab === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Remaining / Pending ({remainingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRosterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                rosterTab === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>All Registered ({totalRegisteredCount})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, roll no, ticket..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Roster Table */}
        {loading ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading live attendance roster...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-2">
            <UserX className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-medium text-slate-300">
              {rosterTab === 'present'
                ? 'No participants checked in yet for this event.'
                : rosterTab === 'pending'
                ? 'All registered participants have checked in!'
                : 'No registered participants found.'}
            </p>
            <p className="text-[11px] text-slate-500">
              Use the Rapid Scanner above to begin checking in participants.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Student Participant</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Ticket Code</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Time Checked-in</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredRoster.map((item, idx) => (
                  <tr key={`${item.registration_id}-${item.roll_number}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-sans font-bold text-white flex items-center gap-1.5">
                        {item.participant_name}
                        {item.is_leader && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                            LEAD
                          </span>
                        )}
                        {item.team_name && (
                          <span className="text-[9px] font-mono text-slate-500">
                            ({item.team_name})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                        {item.email}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-cyan-300 font-bold font-mono">
                      {item.roll_number}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {item.ticket_code}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400">
                      {item.department || 'CSE (AIML)'} {item.year ? `• ${item.year}` : ''}
                    </td>

                    <td className="py-3 px-4">
                      {item.checked_in ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                          <Check className="w-3 h-3 text-emerald-400" />
                          PRESENT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] border border-slate-700">
                          <Clock className="w-3 h-3 text-slate-500" />
                          NOT CHECKED IN
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-emerald-400 font-mono">
                      {item.checked_in_at ? (
                        <div>
                          <div>
                            {new Date(item.checked_in_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.checkin_method || 'Rapid Scanner'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.checked_in && item.checkin_id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteCheckin(item.checkin_id!, item.participant_name)}
                          title="Undo Check-In (Mark Absent)"
                          className="p-1.5 rounded-lg hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickCheckinFromRoster(item)}
                          title="Check In Participant Directly"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 hover:text-white text-[11px] font-medium transition-colors border border-emerald-500/30 flex items-center gap-1 ml-auto"
                        >
                          <Check className="w-3 h-3" />
                          <span>Check In</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
