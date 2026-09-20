import React, { useState, useEffect } from 'react';
import { Event, TeamMemberRegistration } from '../types';
import { api } from '../lib/api';
import { X, Sparkles, CheckCircle2, AlertCircle, Loader2, Calendar, MapPin, Users, UserPlus, Trash2, ShieldCheck, User, Download, Printer, QrCode, Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';

interface EventRegisterModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EventRegisterModal: React.FC<EventRegisterModalProps> = ({
  event,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Leader / Solo state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('CSE (AIML)');
  const [year, setYear] = useState('3rd Year');
  const [rollNumber, setRollNumber] = useState('');

  // Team / Duo state
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberRegistration[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  const pType = event?.participation_type || 'SOLO';
  const minTeam = event?.min_team_size || (pType === 'SOLO' ? 1 : 2);
  const maxTeam = event?.max_team_size || (pType === 'SOLO' ? 1 : pType === 'DUO' ? 2 : 4);

  // Generate QR Code ONLY after successful registration is confirmed
  useEffect(() => {
    if (successData?.registration && successData.registration.status === 'Confirmed') {
      const reg = successData.registration;
      const payload =
        successData.qr_payload ||
        reg.qr_payload ||
        (successData.qr_token ? `ATTENDANCE:${successData.qr_token}` : (reg.qr_token ? `ATTENDANCE:${reg.qr_token}` : `ATTENDANCE:${reg.id}`));

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => {
          setQrDataUrl(url);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    } else {
      setQrDataUrl(null);
    }
  }, [successData]);

  // Download official high-resolution event ticket image
  const handleDownloadTicket = () => {
    if (!qrDataUrl || !event) return;
    const ticketCode =
      successData?.ticket_code ||
      successData?.registration?.ticket_code ||
      (successData?.registration?.id ? `TKT-${successData.registration.id.slice(-6).toUpperCase()}` : 'TKT-PASS');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 780;

    // Background
    ctx.fillStyle = '#0D1017';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer border
    ctx.strokeStyle = '#1A1C23';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    // Header strip
    ctx.fillStyle = '#121620';
    ctx.fillRect(16, 16, canvas.width - 32, 90);

    // Header branding
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('INTELLIGENZ CLUB', canvas.width / 2, 48);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '11px sans-serif';
    ctx.fillText('OFFICIAL EVENT ATTENDANCE PASS', canvas.width / 2, 70);

    ctx.fillStyle = '#E5E7EB';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(ticketCode, canvas.width / 2, 92);

    // Helper to wrap canvas text
    const wrapCanvasLines = (text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const w of words) {
        const testLine = currentLine ? `${currentLine} ${w}` : w;
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = w;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // Event title (auto-wrapped)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    const titleLines = wrapCanvasLines(event.title, 520).slice(0, 2);
    let currentY = 132;
    titleLines.forEach((line) => {
      ctx.fillText(line, canvas.width / 2, currentY);
      currentY += 20;
    });

    // Event date & venue (auto-wrapped)
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${event.date} • ${event.start_time}`, canvas.width / 2, currentY + 4);
    currentY += 20;

    if (event.venue) {
      const venueLines = wrapCanvasLines(event.venue, 520).slice(0, 2);
      venueLines.forEach((vLine) => {
        ctx.fillText(vLine, canvas.width / 2, currentY);
        currentY += 16;
      });
    }

    // Draw QR Image
    const qrImg = new Image();
    qrImg.onload = () => {
      const qrSize = 270;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = Math.max(currentY + 10, 205);

      // QR white frame
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Participant info panel
      const infoPanelY = qrY + qrSize + 24;
      ctx.fillStyle = '#0A0B0E';
      ctx.fillRect(36, infoPanelY, canvas.width - 72, 126);
      ctx.strokeStyle = '#1A1C23';
      ctx.lineWidth = 1;
      ctx.strokeRect(36, infoPanelY, canvas.width - 72, 126);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#6B7280';
      ctx.font = '11px sans-serif';
      ctx.fillText('PARTICIPANT:', 56, infoPanelY + 28);
      ctx.fillText('ROLL NUMBER:', 56, infoPanelY + 56);
      ctx.fillText('DEPARTMENT:', 56, infoPanelY + 84);
      ctx.fillText('PASS TYPE:', 56, infoPanelY + 110);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px sans-serif';
      const nameStr = pType !== 'SOLO' ? `${fullName} (Team: ${teamName})` : fullName;
      ctx.fillText(nameStr.length > 40 ? nameStr.substring(0, 38) + '...' : nameStr, 180, infoPanelY + 28);
      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 13px monospace';
      const displayRollNumber = (successData?.registration?.roll_number || rollNumber || '').toUpperCase();
      ctx.fillText(displayRollNumber, 180, infoPanelY + 56);
      ctx.fillStyle = '#D1D5DB';
      ctx.font = '12px sans-serif';
      ctx.fillText(department, 180, infoPanelY + 84);
      ctx.fillStyle = '#A78BFA';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${pType} (${totalCurrentMembers} Members)`, 180, infoPanelY + 110);

      // Bottom verification prompt
      ctx.textAlign = 'center';
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('✓ Scan QR code at entrance for automated check-in', canvas.width / 2, infoPanelY + 144);

      const link = document.createElement('a');
      link.download = `event-ticket-${ticketCode}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 100);
    };
    qrImg.src = qrDataUrl;
  };

  // Print official scanner-friendly ticket (iframe-safe, popup-blocker proof)
  const handlePrintTicket = () => {
    if (!qrDataUrl || !event) return;
    const displayRollNumber = (successData?.registration?.roll_number || rollNumber || '').toUpperCase();
    const ticketCode =
      successData?.ticket_code ||
      successData?.registration?.ticket_code ||
      (successData?.registration?.id ? `TKT-${successData.registration.id.slice(-6).toUpperCase()}` : 'TKT-PASS');

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Event Attendance Pass - ${ticketCode}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111; padding: 24px; text-align: center; }
            .ticket-card { border: 2px solid #111; border-radius: 12px; padding: 24px; max-width: 460px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { border-bottom: 2px dashed #ccc; padding-bottom: 14px; margin-bottom: 16px; }
            .club-name { font-size: 19px; font-weight: 800; letter-spacing: 1px; color: #000; }
            .sub { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; }
            .ticket-badge { display: inline-block; background: #000; color: #fff; font-family: monospace; font-size: 14px; font-weight: bold; padding: 4px 14px; border-radius: 4px; margin-top: 10px; }
            .event-title { font-size: 17px; font-weight: bold; margin: 14px 0 6px; color: #111; word-break: break-word; overflow-wrap: break-word; }
            .event-meta { font-size: 12px; color: #555; margin-bottom: 16px; line-height: 1.4; word-break: break-word; overflow-wrap: break-word; }
            .qr-wrapper { margin: 12px auto; padding: 12px; background: #fff; border: 1px solid #ddd; display: inline-block; border-radius: 8px; }
            .qr-img { width: 230px; height: 230px; display: block; }
            .details-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; margin-top: 16px; }
            .details-table td { padding: 6px 8px; border-bottom: 1px solid #eee; }
            .details-table td.label { color: #666; width: 35%; font-weight: 500; }
            .details-table td.val { font-weight: bold; color: #111; }
            .footer-note { font-size: 11px; color: #059669; font-weight: bold; margin-top: 18px; border-top: 2px dashed #ccc; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="ticket-card">
            <div class="header">
              <div class="club-name">INTELLIGENZ CLUB</div>
              <div class="sub">DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY</div>
              <div class="ticket-badge">${ticketCode}</div>
            </div>
            <div class="event-title">${event.title}</div>
            <div class="event-meta">${event.date} • ${event.start_time}<br/>${event.venue}</div>
            <div class="qr-wrapper">
              <img class="qr-img" src="${qrDataUrl}" alt="Attendance Verification QR Code" />
            </div>
            <table class="details-table">
              <tr>
                <td class="label">Participant</td>
                <td class="val">${fullName} ${pType !== 'SOLO' ? `(Team: ${teamName})` : ''}</td>
              </tr>
              <tr>
                <td class="label">Roll Number</td>
                <td class="val">${displayRollNumber}</td>
              </tr>
              <tr>
                <td class="label">Department</td>
                <td class="val">${department} (${year})</td>
              </tr>
              <tr>
                <td class="label">Attendance Status</td>
                <td class="val" style="color: #059669;">Confirmed (Eligible for Check-In)</td>
              </tr>
            </table>
            <div class="footer-note">
              ✓ Scan at event entrance for instant automated check-in
            </div>
          </div>
        </body>
      </html>
    `;

    // Try hidden iframe print first to bypass iframe popup blocking
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 1500);
        }, 350);
        return;
      }
    } catch {
      // Fall back to window.open if iframe printing not permitted
    }

    const printWindow = window.open('', '_blank', 'width=650,height=800');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 500);
      };
    }
  };

  const handleCopyTicketCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  // Initialize members when event changes
  useEffect(() => {
    if (!event) return;
    if (event.participation_type === 'DUO') {
      setTeamMembers([
        { full_name: '', email: '', roll_number: '', department: 'CSE (AIML)', year: '3rd Year' },
      ]);
    } else if (event.participation_type === 'TEAM') {
      const initialAdditional = Math.max(1, (event.min_team_size || 2) - 1);
      setTeamMembers(
        Array.from({ length: initialAdditional }, () => ({
          full_name: '',
          email: '',
          roll_number: '',
          department: 'CSE (AIML)',
          year: '3rd Year',
        }))
      );
    } else {
      setTeamMembers([]);
    }
    setError(null);
  }, [event]);

  if (!isOpen || !event) return null;

  const totalCurrentMembers = 1 + teamMembers.length; // Leader + additional members

  const handleAddMember = () => {
    if (totalCurrentMembers >= maxTeam) return;
    setTeamMembers((prev) => [
      ...prev,
      { full_name: '', email: '', roll_number: '', department: 'CSE (AIML)', year: '3rd Year' },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    if (pType === 'DUO') return; // Cannot remove in duo
    if (totalCurrentMembers <= minTeam) {
      setError(`Minimum team size for this event is ${minTeam} members.`);
      return;
    }
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof TeamMemberRegistration, value: string) => {
    setTeamMembers((prev) => {
      const updated = [...prev];
      const val = field === 'roll_number' ? value.toUpperCase() : value;
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedRollNumber = (rollNumber || '').trim().toUpperCase();
    if (!formattedRollNumber) {
      setError('Please enter a valid Roll Number.');
      return;
    }
    setRollNumber(formattedRollNumber);

    // Front-end validation
    if (pType !== 'SOLO' && !teamName.trim()) {
      setError(`Please enter a ${pType === 'DUO' ? 'Duo' : 'Team'} Name.`);
      return;
    }

    if (pType === 'TEAM') {
      if (totalCurrentMembers < minTeam || totalCurrentMembers > maxTeam) {
        setError(`Team size must be between ${minTeam} and ${maxTeam} members.`);
        return;
      }
    }

    // Validate member fields for DUO and TEAM
    if (pType !== 'SOLO') {
      for (let i = 0; i < teamMembers.length; i++) {
        const m = teamMembers[i];
        if (!m.full_name.trim() || !m.email.trim() || !m.roll_number.trim()) {
          setError(`Please fill in all details for Member #${i + 2} (Name, Email, Roll Number).`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const formattedMembers = teamMembers.map((m) => ({
        ...m,
        roll_number: (m.roll_number || '').trim().toUpperCase(),
      }));

      const res = await api.registerForEvent(event.id, {
        full_name: fullName,
        email,
        phone,
        department,
        year,
        roll_number: formattedRollNumber,
        team_name: pType !== 'SOLO' ? teamName : undefined,
        team_members: pType !== 'SOLO' ? formattedMembers : undefined,
      });

      setSuccessData(res);
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#A78BFA', '#3B82F6', '#10B981'],
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    setError(null);
    onClose();
  };

  const displayPassRollNumber = (
    successData?.registration?.roll_number ||
    rollNumber ||
    ''
  ).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-[#0D1017] border border-[#1A1C23] p-5 sm:p-7 shadow-2xl shadow-cyan-950/40 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-[#1A1C23] text-[#9CA3AF] hover:text-white hover:bg-[#252833] transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {successData ? (
          <div className="py-2 sm:py-3 space-y-4 sm:space-y-5">
            {/* Header: Status Icon, Heading, and Subtitle */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit'] tracking-tight">
                {successData.registration?.status === 'Confirmed' ? 'Registration Confirmed!' : 'Registration Waitlisted'}
              </h3>
              <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-xl mx-auto leading-relaxed break-words px-2">
                {pType !== 'SOLO' ? (
                  <>
                    Team <span className="text-[#00E5FF] font-semibold">{teamName}</span> ({totalCurrentMembers} Members) registered for <span className="text-white font-medium">{event.title}</span>.
                  </>
                ) : (
                  <>
                    <span className="text-white font-semibold">{fullName}</span> (Roll: <span className="font-mono text-[#00E5FF] font-bold">{displayPassRollNumber}</span>) registered for <span className="text-white font-medium">{event.title}</span>.
                  </>
                )}
              </p>
            </div>

            {/* If Confirmed: Show Unique Attendance QR Pass Card */}
            {successData.registration?.status === 'Confirmed' ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#08090C] border border-[#1E222D] shadow-inner space-y-4">
                {/* Attendance Ticket Header with Ticket Code Badge & Copy Code Button */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#1A1D27] pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Attendance Ticket:</span>
                    <span className="font-mono font-bold text-[#00E5FF] text-sm bg-[#00E5FF]/10 px-2.5 py-0.5 rounded border border-[#00E5FF]/20">
                      {successData.ticket_code || successData.registration?.ticket_code || `TKT-${successData.registration?.id?.slice(-6)?.toUpperCase()}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyTicketCode(
                        successData.ticket_code ||
                          successData.registration?.ticket_code ||
                          `TKT-${successData.registration?.id?.slice(-6)?.toUpperCase()}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1C2233] border border-[#222838] text-[11px] text-[#9CA3AF] hover:text-white transition-all cursor-pointer"
                  >
                    {copiedTicket ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#00E5FF]" />
                        <span className="font-medium">Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* QR Code Container on Left & Multi-Line Detailed Information on Right */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 bg-[#0E1118] p-4 sm:p-5 rounded-xl border border-[#1F2330]">
                  {/* QR Code Card on Left */}
                  <div className="relative p-2.5 sm:p-3 bg-white rounded-xl shadow-lg shrink-0 flex items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Attendance QR Code"
                        className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded"
                      />
                    ) : (
                      <div className="w-36 h-36 sm:w-40 sm:h-40 flex flex-col items-center justify-center text-gray-500 bg-gray-100 rounded">
                        <Loader2 className="w-6 h-6 animate-spin text-[#00E5FF] mb-1" />
                        <span className="text-[10px] font-medium">Generating QR...</span>
                      </div>
                    )}
                  </div>

                  {/* Information Details on Right: flex-1 min-w-0 for robust wrapping */}
                  <div className="flex-1 min-w-0 text-left space-y-3 w-full">
                    {/* EVENT */}
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase text-[#6B7280] font-bold tracking-wider mb-0.5">
                        EVENT
                      </div>
                      <div className="text-white font-bold text-sm sm:text-base leading-snug break-words">
                        {event.title}
                      </div>
                    </div>

                    {/* PARTICIPANT & ROLL NUMBER */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#1F2330]">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase text-[#6B7280] font-bold tracking-wider mb-0.5">
                          PARTICIPANT
                        </div>
                        <div className="text-[#E5E7EB] font-semibold text-xs sm:text-sm break-words leading-tight">
                          {pType !== 'SOLO' ? `${fullName} (${teamName})` : fullName}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase text-[#6B7280] font-bold tracking-wider mb-0.5">
                          ROLL NUMBER
                        </div>
                        <div className="font-mono text-[#00E5FF] font-bold text-xs sm:text-sm tracking-wide break-all">
                          {displayPassRollNumber}
                        </div>
                      </div>
                    </div>

                    {/* VENUE & TIME */}
                    <div className="pt-2 border-t border-[#1F2330] min-w-0">
                      <div className="text-[10px] uppercase text-[#6B7280] font-bold tracking-wider mb-0.5">
                        VENUE & TIME
                      </div>
                      <div className="text-[#D1D5DB] text-xs sm:text-sm leading-relaxed break-words">
                        {event.date} • {event.start_time}{event.venue ? ` (${event.venue})` : ''}
                      </div>
                    </div>

                    {/* Ready for entrance check-in badge */}
                    <div className="pt-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>Ready for entrance check-in</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notice box */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-left text-xs text-[#A7F3D0] flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] sm:text-xs leading-relaxed text-[#D1D5DB] break-words">
                    <strong className="text-white font-semibold">Keep this QR ready:</strong> Present this QR code on your phone or print it. The event coordinator will scan it with the scanner for instant automated check-in.
                  </p>
                </div>

                {/* Download Pass and Print Ticket Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadTicket}
                    disabled={!qrDataUrl}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#141824] hover:bg-[#1C2233] border border-[#262C40] hover:border-[#00E5FF]/40 text-white text-xs font-semibold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#00E5FF] shrink-0" />
                    <span>Download Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintTicket}
                    disabled={!qrDataUrl}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#141824] hover:bg-[#1C2233] border border-[#262C40] hover:border-[#A78BFA]/40 text-white text-xs font-semibold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#A78BFA] shrink-0" />
                    <span>Print Ticket</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left text-xs space-y-2 text-amber-200">
                <p className="font-semibold text-white">Notice: Event Capacity Reached</p>
                <p className="text-[#D1D5DB] leading-relaxed">
                  Your registration has been placed on the waitlist. An attendance QR ticket will be issued if your registration is confirmed by event coordinators.
                </p>
              </div>
            )}

            {/* DONE Action Button */}
            <button
              onClick={handleClose}
              className="w-full py-3 sm:py-3.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg shadow-[#00E5FF]/20 hover:shadow-[#00E5FF]/30 transition-all cursor-pointer"
            >
              DONE
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="mb-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00E5FF] px-2.5 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                  <Sparkles className="w-3 h-3" />
                  Event Registration
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A78BFA] px-2.5 py-1 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/20">
                  <Users className="w-3 h-3" />
                  {pType === 'SOLO' && 'Solo Event (1 Participant)'}
                  {pType === 'DUO' && 'Duo Event (2 Members Required)'}
                  {pType === 'TEAM' && `Team Event (${minTeam}–${maxTeam} Members)`}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white font-['Outfit'] leading-snug">
                {event.title}
              </h3>
              
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#9CA3AF]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>{event.date} • {event.start_time}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span className="truncate max-w-[240px]">{event.venue}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              {/* Team Name for DUO / TEAM */}
              {pType !== 'SOLO' && (
                <div className="p-3.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {pType === 'DUO' ? 'Duo / Pair Name *' : 'Team Name *'}
                    </label>
                    <span className="text-[11px] text-[#9CA3AF]">
                      Team Size: <strong className="text-white">{totalCurrentMembers}</strong> of {minTeam === maxTeam ? minTeam : `${minTeam}–${maxTeam}`}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={pType === 'DUO' ? 'e.g. AI Pioneers' : 'e.g. Neural Ninjas'}
                    value={teamName || ''}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-colors"
                  />
                </div>
              )}

              {/* Section 1: Team Leader / Solo Participant */}
              <div className="p-4 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A1C23] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#D1D5DB] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#00E5FF]" />
                    {pType === 'SOLO' ? 'Participant Details' : 'Team Leader (Participant 1)'}
                  </h4>
                  <span className="text-[10px] font-semibold text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded">
                    Primary Contact
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={fullName || ''}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                      College Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@drkvsrit.ac.in"
                      value={email || ''}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                      Roll Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 238X1A05XX"
                      value={rollNumber || ''}
                      onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs font-mono uppercase focus:outline-none focus:border-[#00E5FF] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                      Department *
                    </label>
                    <select
                      value={department || 'CSE (AIML)'}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-colors"
                    >
                      <option value="CSE (AIML)">CSE (AIML)</option>
                      <option value="AI & Data Science">AI &amp; Data Science</option>
                      <option value="CSE Core">CSE Core</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Civil">Civil</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                      Year of Study *
                    </label>
                    <select
                      value={year || '3rd Year'}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-colors"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone || ''}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-colors"
                  />
                </div>
              </div>

              {/* Section 2: Team Members (DUO / TEAM) */}
              {pType !== 'SOLO' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {pType === 'DUO' ? 'Participant 2 Details' : 'Team Members'}
                    </h4>
                    {pType === 'TEAM' && totalCurrentMembers < maxTeam && (
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="px-2.5 py-1 rounded bg-[#A78BFA]/10 hover:bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <UserPlus className="w-3 h-3" />
                        Add Member ({totalCurrentMembers}/{maxTeam})
                      </button>
                    )}
                  </div>

                  {teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-[#1A1C23] pb-1.5">
                        <span className="text-xs font-semibold text-[#D1D5DB]">
                          Member #{idx + 2}
                        </span>
                        {pType === 'TEAM' && totalCurrentMembers > minTeam && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="p-1 rounded text-[#9CA3AF] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Priya Sharma"
                          value={member.full_name || ''}
                          onChange={(e) => handleMemberChange(idx, 'full_name', e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#A78BFA] transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                            College Email *
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="member@drkvsrit.ac.in"
                            value={member.email || ''}
                            onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#A78BFA] transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                            Roll Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 238X1A05YY"
                            value={member.roll_number || ''}
                            onChange={(e) => handleMemberChange(idx, 'roll_number', e.target.value.toUpperCase())}
                            className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs font-mono uppercase focus:outline-none focus:border-[#A78BFA] transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                            Department
                          </label>
                          <select
                            value={member.department || 'CSE (AIML)'}
                            onChange={(e) => handleMemberChange(idx, 'department', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#A78BFA] transition-colors"
                          >
                            <option value="CSE (AIML)">CSE (AIML)</option>
                            <option value="AI & Data Science">AI &amp; Data Science</option>
                            <option value="CSE Core">CSE Core</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Civil">Civil</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                            Year
                          </label>
                          <select
                            value={member.year || '3rd Year'}
                            onChange={(e) => handleMemberChange(idx, 'year', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#A78BFA] transition-colors"
                          >
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#00E5FF]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating & Registering...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {pType === 'SOLO'
                          ? 'CONFIRM SOLO REGISTRATION'
                          : `CONFIRM ${pType} REGISTRATION (${totalCurrentMembers} MEMBERS)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
