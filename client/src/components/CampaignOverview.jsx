import React, { useEffect, useState } from 'react';
import { fetchCampaignOverview } from '../services/api';

function formatWow(wow) {
  if (wow === null || wow === undefined) return '—';
  const sign = wow > 0 ? '+' : '';
  return `${sign}${wow}%`;
}

function StatSkeleton() {
  return (
    <div className="stats-row stats-row-overview">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="stat-card stat-card-skeleton" aria-hidden />
      ))}
    </div>
  );
}

export default function CampaignOverview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchCampaignOverview()
      .then((res) => setData(res.data))
      .catch(console.error);
  }, []);

  if (!data) return <StatSkeleton />;

  const wow = data.wowGrowth;
  const wowClass =
    wow == null ? '' : wow >= 0 ? 'stat-card-wow stat-card-wow-up' : 'stat-card-wow stat-card-wow-down';

  return (
    <></>
    // <div className="stats-row stats-row-overview">
    //   <div className="stat-card stat-card--videos">
    //     <div className="stat-card-accent" aria-hidden />
    //     <div className="label">Total videos</div>
    //     <div className="value">{data.totalVideos}</div>
    //   </div>
    //   <div className="stat-card stat-card--views">
    //     <div className="stat-card-accent" aria-hidden />
    //     <div className="label">Total views</div>
    //     <div className="value">{Number(data.totalViews).toLocaleString()}</div>
    //   </div>
    //   <div className="stat-card stat-card--engagement">
    //     <div className="stat-card-accent" aria-hidden />
    //     <div className="label">Avg engagement</div>
    //     <div className="value accent">{data.avgEngagementRate}%</div>
    //   </div>
    //   <div className="stat-card stat-card--influencer">
    //     <div className="stat-card-accent" aria-hidden />
    //     <div className="label">Top influencer</div>
    //     <div className="value value-text" title={data.topInfluencer?.name || ''}>
    //       {data.topInfluencer ? data.topInfluencer.name : '—'}
    //     </div>
    //     {data.topInfluencer && (
    //       <div className="stat-sub">
    //         {Number(data.topInfluencer.views).toLocaleString()} views
    //       </div>
    //     )}
    //   </div>
    //   <div className="stat-card stat-card--growth">
    //     <div className="stat-card-accent" aria-hidden />
    //     {/* <div className="label">WoW growth</div> */}
    //     <div className={`value ${wowClass}`}>{formatWow(wow)}</div>
    //     {/* <div className={`value ${wowClass}`}>33%</div> */}
    //     <div className="stat-sub">vs prior 7 days (views)</div>
    //   </div>
    // </div>
  );
}
