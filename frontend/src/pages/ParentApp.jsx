import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Papa from 'papaparse';
import { HiOutlineDownload, HiOutlinePrinter, HiOutlineKey } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { userApi } from '../api/userApi';

const CLASS_ORDER = ['Jr. KG', 'Sr. KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const formatClassLabel = (c) => (c.startsWith('Jr') || c.startsWith('Sr') ? c : `Class ${c}`);

const downloadCsv = (rows, filename) => {
  const csv = Papa.unparse(rows);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ParentApp = () => {
  const parentUrl = `${window.location.origin}/parent/login`;
  const isLocal = /localhost|127\.0\.0\.1/.test(window.location.hostname);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [parents, setParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [bulkClass, setBulkClass] = useState('');
  const [working, setWorking] = useState(false);
  const [singleResult, setSingleResult] = useState(null);

  useEffect(() => {
    QRCode.toDataURL(parentUrl, { width: 600, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch(() => toast.error('Failed to generate QR code'));
  }, [parentUrl]);

  useEffect(() => {
    userApi.getParents().then((res) => setParents(res.data.data || [])).catch(() => {});
  }, []);

  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'abubakar-parent-app-qr.png';
    a.click();
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Allow pop-ups to print');
      return;
    }
    w.document.write(`<!doctype html><html><head><title>Parent App QR</title>
      <style>body{font-family:Arial,sans-serif;text-align:center;padding:40px}img.qr{width:380px;height:380px}
      img.logo{height:90px}h1{margin:12px 0 4px}p{color:#444;font-size:16px;margin:6px 0}</style></head><body>
      <img class="logo" src="${window.location.origin}/logo.png" />
      <h1>Abubakar English School</h1>
      <p><strong>Parent App</strong> &mdash; scan to open and install</p>
      <img class="qr" src="${qrDataUrl}" />
      <p>Android: tap <b>Install app</b> &nbsp;|&nbsp; iPhone: Safari &rarr; Share &rarr; <b>Add to Home Screen</b></p>
      <p>Login with your child's admission number and the password given by the school.</p>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  };

  const handleResetOne = async () => {
    if (!selectedParent || working) return;
    if (!window.confirm('Generate a new temporary password? The parent\'s current password will stop working.')) return;
    setWorking(true);
    try {
      const res = await userApi.resetParentPassword(selectedParent);
      setSingleResult(res.data.data);
      toast.success('Temporary password generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate password');
    } finally {
      setWorking(false);
    }
  };

  const handleBulk = async () => {
    if (!bulkClass || working) return;
    if (!window.confirm(`Generate new temporary passwords for all parents in ${formatClassLabel(bulkClass)}? Their current passwords will stop working.`)) return;
    setWorking(true);
    try {
      const res = await userApi.bulkParentCredentials({ class: bulkClass });
      const rows = res.data.data || [];
      if (!rows.length) {
        toast.info('No parents found for this class');
      } else {
        downloadCsv(
          rows.map((r) => ({
            'Admission No (Username)': r.admissionNumber,
            Student: r.studentName,
            Class: r.class,
            Parent: r.parentName,
            'Temporary Password': r.tempPassword,
          })),
          `parent-credentials-class-${bulkClass}.csv`
        );
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate credentials');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parent App</h1>
        <p className="text-gray-500">Share the QR code and give parents their login details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Parent App QR Code</h2>
          <p className="text-sm text-gray-500 mb-4 break-all">{parentUrl}</p>
          {isLocal && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              You are on localhost. Open this page from the live website so the QR code points to the real address.
            </div>
          )}
          {qrDataUrl && <img src={qrDataUrl} alt="Parent app QR code" className="mx-auto w-64 h-64" />}
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={handlePrint} disabled={!qrDataUrl} className="btn-primary flex items-center gap-2">
              <HiOutlinePrinter className="h-5 w-5" /> Print
            </button>
            <button onClick={handleDownloadQr} disabled={!qrDataUrl} className="btn-secondary flex items-center gap-2">
              <HiOutlineDownload className="h-5 w-5" /> Download PNG
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Parents scan this with their phone camera. Android: tap <strong>Install app</strong>. iPhone: open in
            Safari, then Share &rarr; <strong>Add to Home Screen</strong>.
          </p>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Class credentials sheet</h2>
            <p className="text-sm text-gray-500 mb-4">
              Generates a temporary password for every parent in a class and downloads a CSV (admission number =
              username). Parents must set their own password at first login.
            </p>
            <div className="flex gap-3">
              <select value={bulkClass} onChange={(e) => setBulkClass(e.target.value)} className="input-field flex-1">
                <option value="">Select class</option>
                {CLASS_ORDER.map((c) => <option key={c} value={c}>{formatClassLabel(c)}</option>)}
              </select>
              <button onClick={handleBulk} disabled={!bulkClass || working} className="btn-primary flex items-center gap-2">
                <HiOutlineDownload className="h-5 w-5" /> CSV
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Single parent password</h2>
            <p className="text-sm text-gray-500 mb-4">Issue a new temporary password for one parent (for example a forgotten password).</p>
            <div className="flex gap-3">
              <select value={selectedParent} onChange={(e) => { setSelectedParent(e.target.value); setSingleResult(null); }} className="input-field flex-1">
                <option value="">Select parent</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                    {p.children?.length ? ` (${p.children.map((c) => c.admissionNumber).join(', ')})` : ''}
                  </option>
                ))}
              </select>
              <button onClick={handleResetOne} disabled={!selectedParent || working} className="btn-primary flex items-center gap-2">
                <HiOutlineKey className="h-5 w-5" /> Generate
              </button>
            </div>
            {singleResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <p className="text-gray-700">
                  {singleResult.parentName} &mdash; temporary password (shown once):
                </p>
                <p className="font-mono text-lg font-semibold text-gray-900 my-1">{singleResult.tempPassword}</p>
                <p className="text-gray-600">
                  Username (admission no.): {singleResult.students.map((s) => `${s.admissionNumber} (${s.name})`).join(', ') || 'no linked students'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentApp;
