const express = require('express');
const router  = express.Router();
const Item    = require('../models/Item');

const ALLOWED_SORT_FIELDS = ['name', 'quantity', 'category'];

// ── GET /api/items
router.get('/', async (req, res) => {
  try {
    const { search, sortBy, order, filter } = req.query;

    const query = {};

    // Search: case-insensitive regex across name and category
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { category: regex }];
    }

    // Filter: low-stock only — compare quantity to threshold using $expr
    if (filter === 'low') {
      query.$expr = { $lt: ['$quantity', '$threshold'] };
    }

    // Sort validation
    let sortOption = {};
    if (sortBy) {
      if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
        return res.status(400).json({ error: `Invalid sort field. Allowed: ${ALLOWED_SORT_FIELDS.join(', ')}` });
      }
      sortOption[sortBy] = order === 'desc' ? -1 : 1;
    }

    const items = await Item.find(query).sort(sortOption);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error.', details: err.message });
  }
});

// ── GET /api/items/low-stock
router.get('/low-stock', async (req, res) => {
  try {
    const items = await Item.find({ $expr: { $lt: ['$quantity', '$threshold'] } });

    const prioritized = items
      .map(item => ({
        ...item.toObject(),
        deficitScore: item.threshold - item.quantity,
      }))
      .sort((a, b) => b.deficitScore - a.deficitScore);

    res.json(prioritized);
  } catch (err) {
    res.status(500).json({ error: 'Server error.', details: err.message });
  }
});

// ── POST /api/items
router.post('/', async (req, res) => {
  try {
    const { name, quantity, category, threshold, notes } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required.' });
    }
    if (quantity === undefined || quantity === null || isNaN(quantity) || Number(quantity) < 0) {
      return res.status(400).json({ error: 'Quantity must be a non-negative number.' });
    }
    if (threshold !== undefined && (isNaN(threshold) || Number(threshold) < 0)) {
      return res.status(400).json({ error: 'Threshold must be a non-negative number.' });
    }

    const item = new Item({
      name:      name.trim(),
      quantity:  Number(quantity),
      category:  category || 'Uncategorized',
      threshold: threshold !== undefined ? Number(threshold) : 5,
      notes:     notes || '',
    });

    const saved = await item.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error.', details: err.message });
  }
});

// ── PUT /api/items/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID.' });
    }

    const { name, quantity, category, threshold, notes } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Item name cannot be empty.' });
    }
    if (quantity !== undefined && (isNaN(quantity) || Number(quantity) < 0)) {
      return res.status(400).json({ error: 'Quantity must be a non-negative number.' });
    }
    if (threshold !== undefined && (isNaN(threshold) || Number(threshold) < 0)) {
      return res.status(400).json({ error: 'Threshold must be a non-negative number.' });
    }

    const updated = await Item.findByIdAndUpdate(
      id,
      {
        ...(name      !== undefined && { name:      name.trim()      }),
        ...(quantity  !== undefined && { quantity:  Number(quantity) }),
        ...(category  !== undefined && { category                    }),
        ...(threshold !== undefined && { threshold: Number(threshold)}),
        ...(notes     !== undefined && { notes                       }),
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: 'Item not found.' });
    res.json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error.', details: err.message });
  }
});

// ── DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID.' });
    }

    const deleted = await Item.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Item not found.' });

    res.json({ message: 'Item deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.', details: err.message });
  }
});

module.exports = router;