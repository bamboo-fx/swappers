const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { 
  processSwapRequest, 
  confirmSwapMatch, 
  findMutualSwapMatches 
} = require('../services/matchingAlgorithm');

const router = express.Router();

router.get('/requests', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data: swapRequests, error } = await supabase
      .from('swap_requests')
      .select(`
        id,
        status,
        priority,
        notes,
        created_at,
        expires_at,
        from_course:courses!swap_requests_from_course_id_fkey (
          id,
          course_code,
          course_title,
          department,
          time_slots (
            day_of_week,
            start_time,
            end_time,
            location
          )
        ),
        desired_course:courses!swap_requests_desired_course_id_fkey (
          id,
          course_code,
          course_title,
          department,
          time_slots (
            day_of_week,
            start_time,
            end_time,
            location
          )
        )
      `)
      .eq('requester_id', req.user.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      swapRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: swapRequests.length
      }
    });

  } catch (error) {
    console.error('Error fetching swap requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/requests', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { fromCourseId, desiredCourseId, priority = 1, notes } = req.body;

    if (!fromCourseId || !desiredCourseId) {
      return res.status(400).json({ 
        error: 'Both fromCourseId and desiredCourseId are required' 
      });
    }

    if (fromCourseId === desiredCourseId) {
      return res.status(400).json({ 
        error: 'Cannot swap a course for itself' 
      });
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('course_id', fromCourseId)
      .eq('enrollment_status', 'enrolled')
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(400).json({ 
        error: 'You must be enrolled in the course you want to swap from' 
      });
    }

    const { data: existingRequest } = await supabase
      .from('swap_requests')
      .select('id')
      .eq('requester_id', req.user.id)
      .eq('from_course_id', fromCourseId)
      .eq('desired_course_id', desiredCourseId)
      .eq('status', 'active')
      .single();

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'You already have an active swap request for these courses' 
      });
    }

    const { data: swapRequest, error } = await supabase
      .from('swap_requests')
      .insert({
        requester_id: req.user.id,
        from_course_id: fromCourseId,
        desired_course_id: desiredCourseId,
        priority,
        notes,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    try {
      const matchResult = await processSwapRequest(swapRequest.id);
      
      res.status(201).json({
        message: 'Swap request created successfully',
        swapRequest,
        matchResult
      });
    } catch (matchError) {
      console.error('Error processing swap match:', matchError);
      res.status(201).json({
        message: 'Swap request created successfully (matching will be processed later)',
        swapRequest,
        matchResult: { matched: false, error: matchError.message }
      });
    }

  } catch (error) {
    console.error('Error creating swap request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/requests/:requestId', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { priority, notes, status } = req.body;

    const { data: existingRequest, error: fetchError } = await supabase
      .from('swap_requests')
      .select('id')
      .eq('id', requestId)
      .eq('requester_id', req.user.id)
      .single();

    if (fetchError || !existingRequest) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    const updateData = {};
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;
    if (status && ['active', 'cancelled'].includes(status)) {
      updateData.status = status;
    }

    const { data: swapRequest, error } = await supabase
      .from('swap_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Swap request updated successfully',
      swapRequest
    });

  } catch (error) {
    console.error('Error updating swap request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/requests/:requestId', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const { data: existingRequest, error: fetchError } = await supabase
      .from('swap_requests')
      .select('id, status')
      .eq('id', requestId)
      .eq('requester_id', req.user.id)
      .single();

    if (fetchError || !existingRequest) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    if (existingRequest.status === 'matched') {
      return res.status(400).json({ 
        error: 'Cannot cancel a swap request that has been matched' 
      });
    }

    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Swap request cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling swap request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/matches', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data: matches, error } = await supabase
      .from('swap_matches')
      .select(`
        id,
        match_status,
        matched_at,
        confirmed_at,
        student_a:profiles!swap_matches_student_a_id_fkey (
          id,
          full_name,
          email
        ),
        student_b:profiles!swap_matches_student_b_id_fkey (
          id,
          full_name,
          email
        ),
        course_a:courses!swap_matches_course_a_id_fkey (
          id,
          course_code,
          course_title,
          department
        ),
        course_b:courses!swap_matches_course_b_id_fkey (
          id,
          course_code,
          course_title,
          department
        )
      `)
      .or(`student_a_id.eq.${req.user.id},student_b_id.eq.${req.user.id}`)
      .eq('match_status', status)
      .order('matched_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      matches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: matches.length
      }
    });

  } catch (error) {
    console.error('Error fetching swap matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/matches/:matchId/confirm', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;

    const result = await confirmSwapMatch(matchId, req.user.id);

    res.json({
      message: 'Swap match confirmed and executed successfully',
      result
    });

  } catch (error) {
    console.error('Error confirming swap match:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/matches/:matchId/reject', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;

    const { data: match, error: fetchError } = await supabase
      .from('swap_matches')
      .select('student_a_id, student_b_id, request_a_id, request_b_id')
      .eq('id', matchId)
      .eq('match_status', 'pending')
      .single();

    if (fetchError || !match) {
      return res.status(404).json({ error: 'Swap match not found or already processed' });
    }

    if (match.student_a_id !== req.user.id && match.student_b_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to reject this match' });
    }

    const { error } = await supabase
      .from('swap_matches')
      .update({ match_status: 'rejected' })
      .eq('id', matchId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await Promise.all([
      supabase
        .from('swap_requests')
        .update({ status: 'active' })
        .eq('id', match.request_a_id),
      supabase
        .from('swap_requests')
        .update({ status: 'active' })
        .eq('id', match.request_b_id)
    ]);

    res.json({ message: 'Swap match rejected successfully' });

  } catch (error) {
    console.error('Error rejecting swap match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/marketplace', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { 
      search, 
      department, 
      semester = 'Fall', 
      year = new Date().getFullYear(),
      page = 1,
      limit = 20 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('swap_requests')
      .select(`
        id,
        priority,
        notes,
        created_at,
        requester:profiles!swap_requests_requester_id_fkey (
          id,
          full_name,
          email
        ),
        from_course:courses!swap_requests_from_course_id_fkey (
          id,
          course_code,
          course_title,
          department,
          semester,
          year,
          time_slots (
            day_of_week,
            start_time,
            end_time,
            location
          )
        ),
        desired_course:courses!swap_requests_desired_course_id_fkey (
          id,
          course_code,
          course_title,
          department,
          semester,
          year,
          time_slots (
            day_of_week,
            start_time,
            end_time,
            location
          )
        )
      `)
      .eq('status', 'active')
      .neq('requester_id', req.user.id);

    if (search) {
      // This is a simplified search - in production, you might want more sophisticated filtering
    }

    const { data: swapRequests, error } = await query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      swapRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: swapRequests.length
      }
    });

  } catch (error) {
    console.error('Error fetching marketplace data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;