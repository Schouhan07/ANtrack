import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  fetchCreatorOfferMappings,
  fetchCreatorNamesForOffers,
  createCreatorOfferMapping,
  updateCreatorOfferMapping,
  deleteCreatorOfferMapping,
} from '../services/api';

export default function CreatorOfferMappings() {
  const [rows, setRows] = useState([]);
  const [creatorNames, setCreatorNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatorInput, setCreatorInput] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [sales, setSales] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ creatorName: '', offerCode: '', sales: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        fetchCreatorOfferMappings(),
        fetchCreatorNamesForOffers(),
      ]);
      setRows(mRes.data);
      setCreatorNames(cRes.data);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = creatorInput.trim();
    const code = offerCode.trim();
    if (!name || !code) {
      toast.error('Creator and offer code are required');
      return;
    }
    try {
      await createCreatorOfferMapping({
        creatorName: name,
        offerCode: code,
        sales: sales === '' ? undefined : Number(sales),
      });
      toast.success('Mapping saved — Influencer tab will include it');
      setOfferCode('');
      setSales('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const startEdit = (r) => {
    setEditingId(r._id);
    setEditForm({
      creatorName: r.creatorName,
      offerCode: r.offerCode,
      sales: r.sales != null ? String(r.sales) : '',
    });
  };

  const saveEdit = async () => {
    try {
      await updateCreatorOfferMapping(editingId, {
        creatorName: editForm.creatorName.trim(),
        offerCode: editForm.offerCode.trim(),
        sales: editForm.sales === '' ? null : Number(editForm.sales),
      });
      toast.success('Updated');
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this offer mapping?')) return;
    try {
      await deleteCreatorOfferMapping(id);
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="page-creator-offers">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Creator offer maps</h1>
          <p className="page-subtitle">
            Link each promo code to a creator (matched by name when scraped). Offer codes are
            globally unique. Data appears in Influencer → Offer codes &amp; Sales.
          </p>
        </div>
      </div>

      <div className="card creator-offers-form-card">
        <h2 className="creator-offers-card-title">Add mapping</h2>
        <form className="creator-offers-form" onSubmit={handleAdd}>
          <div className="creator-offers-form-row">
            <label className="creator-offers-label">
              Creator
              <input
                className="creator-offers-input"
                list="creator-names-list"
                value={creatorInput}
                onChange={(e) => setCreatorInput(e.target.value)}
                placeholder="Pick from list or type handle (must match scraped name)"
                required
              />
              <datalist id="creator-names-list">
                {creatorNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
            <label className="creator-offers-label">
              Offer code
              <input
                className="creator-offers-input"
                value={offerCode}
                onChange={(e) => setOfferCode(e.target.value)}
                placeholder="e.g. RBMASYI"
                autoComplete="off"
                required
              />
            </label>
            <label className="creator-offers-label">
              Sales (optional)
              <input
                className="creator-offers-input"
                type="number"
                min="0"
                step="any"
                value={sales}
                onChange={(e) => setSales(e.target.value)}
                placeholder="—"
              />
            </label>
            <button type="submit" className="btn btn-primary creator-offers-submit">
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="card creator-offers-table-card">
        <h2 className="creator-offers-card-title">Saved mappings</h2>
        {loading ? (
          <p className="muted-caption">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="empty-state empty-state--soft">No mappings yet — add one above.</p>
        ) : (
          <div className="table-wrap">
            <table className="creator-offers-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Offer code</th>
                  <th>Sales</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    {editingId === r._id ? (
                      <>
                        <td>
                          <input
                            className="creator-offers-input creator-offers-input--inline"
                            value={editForm.creatorName}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, creatorName: e.target.value }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="creator-offers-input creator-offers-input--inline"
                            value={editForm.offerCode}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, offerCode: e.target.value }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="creator-offers-input creator-offers-input--inline"
                            type="number"
                            value={editForm.sales}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, sales: e.target.value }))
                            }
                          />
                        </td>
                        <td className="creator-offers-actions">
                          <button type="button" className="btn btn-sm btn-primary" onClick={saveEdit}>
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{r.creatorName}</td>
                        <td>
                          <code className="creator-offers-code">{r.offerCode}</code>
                        </td>
                        <td>{r.sales != null ? r.sales.toLocaleString() : '—'}</td>
                        <td className="creator-offers-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => startEdit(r)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => remove(r._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
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
