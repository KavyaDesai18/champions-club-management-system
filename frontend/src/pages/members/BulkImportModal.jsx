import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  ArrowRight, 
  FileText, 
  AlertCircle,
  RefreshCw,
  Check
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { membersApi } from '../../api/membersApi';
import { useToast } from '../../context/ToastContext';

export default function BulkImportModal({ isOpen, onClose, onSuccess }) {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'completed'
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'VALID' | 'DUPLICATE' | 'INVALID'
  const [commitResult, setCommitResult] = useState(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
    }
  };

  const handleDryRunPreview = async () => {
    if (!file) return;

    try {
      setLoading(true);
      const res = await membersApi.previewBulkImport(file);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setStep('preview');
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Import Preview Failed',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;

    try {
      setLoading(true);
      const res = await membersApi.commitBulkImport(file, previewData?.jobId);
      if (res.success && res.data) {
        setCommitResult(res.data);
        setStep('completed');
        addToast({
          type: 'success',
          title: 'Import Successful',
          message: `Successfully imported ${res.data.validRows} members.`,
        });
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Commit Failed',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrors = async () => {
    const jobId = commitResult?.jobId || previewData?.jobId;
    if (!jobId) return;

    try {
      const blob = await membersApi.downloadErrorReport(jobId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `import-errors-${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: err.message,
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setCommitResult(null);
    setStep('upload');
    setFilterTab('ALL');
  };

  const filteredRows = (previewData?.previewRows || []).filter((row) => {
    if (filterTab === 'ALL') return true;
    return row.status === filterTab;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Bulk Import Members (CSV / Excel)"
      size="xl"
    >
      <div className="space-y-6">
        {step === 'upload' && (
          <div className="space-y-5">
            <p className="text-sm text-zinc-400">
              Upload the club's Excel sheet (<code className="text-emerald-400 font-mono">.xlsx</code>) or <code className="text-emerald-400 font-mono">.csv</code> file.
              Our parser handles BOM encoding, scientific notation phone numbers, Excel date serials, past memberships, and checks for duplicates.
            </p>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                file 
                  ? 'border-emerald-500/60 bg-emerald-500/5' 
                  : 'border-zinc-700/80 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-800/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex flex-col items-center justify-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${file ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  {file ? <FileSpreadsheet className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>

                <div>
                  <h4 className="text-base font-semibold text-zinc-100">
                    {file ? file.name : 'Select or drag & drop membership spreadsheet'}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    {file 
                      ? `${(file.size / 1024).toFixed(1)} KB ready for dry-run analysis` 
                      : 'Supports CSV, XLSX up to 5,000+ rows'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!file}
                loading={loading}
                icon={ArrowRight}
                onClick={handleDryRunPreview}
              >
                Analyze & Dry-Run Preview
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && previewData && (
          <div className="space-y-6">
            {/* Stat Counters Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="text-xs text-zinc-400 font-medium">Total Rows</div>
                <div className="text-2xl font-bold text-zinc-100 mt-0.5">{previewData.totalRows}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Valid to Import
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-0.5">{previewData.validRows}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Duplicates Skipped
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-0.5">{previewData.duplicateRows}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="text-xs text-red-400 font-medium flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Invalid / Errors
                </div>
                <div className="text-2xl font-bold text-red-400 mt-0.5">{previewData.invalidRows}</div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                {['ALL', 'VALID', 'DUPLICATE', 'INVALID'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterTab === tab
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <span className="text-xs text-zinc-400">
                Showing {filteredRows.length} rows
              </span>
            </div>

            {/* Preview Table */}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/80">
              {filteredRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No rows matching filter criteria.
                </div>
              ) : (
                filteredRows.map((row) => (
                  <div key={row.rowNumber} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-800/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-zinc-500 w-8">
                        #{row.rowNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-200 truncate">
                          {row.fullName || '(Blank Name)'}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {row.phone || row.email || 'No contact'} • Plan: {row.planCode || 'DEFAULT'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {row.errorReason && (
                        <span className="text-[11px] text-zinc-400 italic max-w-xs truncate text-right">
                          {row.errorReason}
                        </span>
                      )}
                      <Badge
                        variant={
                          row.status === 'VALID' ? 'success' :
                          row.status === 'DUPLICATE' ? 'warning' : 'danger'
                        }
                        size="sm"
                      >
                        {row.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" onClick={handleReset}>
                Back / Choose Different File
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  loading={loading}
                  disabled={previewData.validRows === 0}
                  icon={Check}
                  onClick={handleCommit}
                >
                  Commit Import ({previewData.validRows} Members)
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'completed' && commitResult && (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-100">
                Import Batch Processed Successfully
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {commitResult.validRows} members successfully created. 
                {commitResult.duplicateRows > 0 && ` ${commitResult.duplicateRows} duplicates skipped.`}
                {commitResult.invalidRows > 0 && ` ${commitResult.invalidRows} invalid rows excluded.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              {(commitResult.invalidRows > 0 || commitResult.duplicateRows > 0) && (
                <Button
                  type="button"
                  variant="outline"
                  icon={Download}
                  onClick={handleDownloadErrors}
                >
                  Download Discrepancy Report (.csv)
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
