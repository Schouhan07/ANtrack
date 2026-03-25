const express = require('express');
const router = express.Router();
const {
  getCampaigns,
  getCampaignSummary,
  getInfluencerNames,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} = require('../controllers/campaignController');

router.get('/', getCampaigns);
router.get('/summary', getCampaignSummary);
router.get('/influencers', getInfluencerNames);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

module.exports = router;
