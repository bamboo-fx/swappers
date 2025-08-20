const { supabaseAdmin } = require('../config/supabase');

const checkTimeConflicts = (existingTimeSlots, newTimeSlots) => {
  for (let existing of existingTimeSlots) {
    for (let newSlot of newTimeSlots) {
      if (existing.day_of_week === newSlot.day_of_week) {
        const existingStart = existing.start_time;
        const existingEnd = existing.end_time;
        const newStart = newSlot.start_time;
        const newEnd = newSlot.end_time;
        
        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

const getStudentSchedule = async (studentId) => {
  try {
    const { data: enrollments, error } = await supabaseAdmin
      .from('enrollments')
      .select(`
        course_id,
        courses (
          id,
          course_code,
          course_title,
          time_slots (
            day_of_week,
            start_time,
            end_time,
            location
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('enrollment_status', 'enrolled');
      
    if (error) throw error;
    
    const timeSlots = [];
    enrollments.forEach(enrollment => {
      if (enrollment.courses && enrollment.courses.time_slots) {
        timeSlots.push(...enrollment.courses.time_slots);
      }
    });
    
    return { enrollments, timeSlots };
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    throw error;
  }
};

const canSwapWithoutConflicts = async (studentAId, studentBId, courseAId, courseBId) => {
  try {
    const [studentASchedule, studentBSchedule] = await Promise.all([
      getStudentSchedule(studentAId),
      getStudentSchedule(studentBId)
    ]);
    
    const { data: courseATimeSlots, error: errorA } = await supabaseAdmin
      .from('time_slots')
      .select('*')
      .eq('course_id', courseAId);
      
    const { data: courseBTimeSlots, error: errorB } = await supabaseAdmin
      .from('time_slots')
      .select('*')
      .eq('course_id', courseBId);
      
    if (errorA || errorB) {
      throw new Error('Error fetching course time slots');
    }
    
    const studentACurrentSlots = studentASchedule.timeSlots.filter(slot => 
      !courseATimeSlots.some(courseSlot => 
        courseSlot.day_of_week === slot.day_of_week &&
        courseSlot.start_time === slot.start_time &&
        courseSlot.end_time === slot.end_time
      )
    );
    
    const studentBCurrentSlots = studentBSchedule.timeSlots.filter(slot => 
      !courseBTimeSlots.some(courseSlot => 
        courseSlot.day_of_week === slot.day_of_week &&
        courseSlot.start_time === slot.start_time &&
        courseSlot.end_time === slot.end_time
      )
    );
    
    const studentAHasConflict = checkTimeConflicts(studentACurrentSlots, courseBTimeSlots);
    const studentBHasConflict = checkTimeConflicts(studentBCurrentSlots, courseATimeSlots);
    
    return !studentAHasConflict && !studentBHasConflict;
    
  } catch (error) {
    console.error('Error checking swap conflicts:', error);
    return false;
  }
};

const findMutualSwapMatches = async (requestId) => {
  try {
    const { data: request, error: requestError } = await supabaseAdmin
      .from('swap_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'active')
      .single();
      
    if (requestError || !request) {
      throw new Error('Swap request not found or inactive');
    }
    
    const { data: potentialMatches, error: matchError } = await supabaseAdmin
      .from('swap_requests')
      .select('*')
      .eq('from_course_id', request.desired_course_id)
      .eq('desired_course_id', request.from_course_id)
      .eq('status', 'active')
      .neq('requester_id', request.requester_id);
      
    if (matchError) {
      throw new Error('Error finding potential matches');
    }
    
    const validMatches = [];
    
    for (let match of potentialMatches) {
      const canSwap = await canSwapWithoutConflicts(
        request.requester_id,
        match.requester_id,
        request.from_course_id,
        request.desired_course_id
      );
      
      if (canSwap) {
        const { data: existingMatch } = await supabaseAdmin
          .from('swap_matches')
          .select('id')
          .or(`request_a_id.eq.${requestId},request_b_id.eq.${requestId}`)
          .or(`request_a_id.eq.${match.id},request_b_id.eq.${match.id}`)
          .eq('match_status', 'pending');
          
        if (!existingMatch || existingMatch.length === 0) {
          validMatches.push(match);
        }
      }
    }
    
    return validMatches;
    
  } catch (error) {
    console.error('Error finding mutual swap matches:', error);
    throw error;
  }
};

const createSwapMatch = async (requestAId, requestBId) => {
  try {
    const [requestA, requestB] = await Promise.all([
      supabaseAdmin.from('swap_requests').select('*').eq('id', requestAId).single(),
      supabaseAdmin.from('swap_requests').select('*').eq('id', requestBId).single()
    ]);
    
    if (requestA.error || requestB.error || !requestA.data || !requestB.data) {
      throw new Error('One or both swap requests not found');
    }
    
    const { data: match, error } = await supabaseAdmin
      .from('swap_matches')
      .insert({
        request_a_id: requestAId,
        request_b_id: requestBId,
        student_a_id: requestA.data.requester_id,
        student_b_id: requestB.data.requester_id,
        course_a_id: requestA.data.from_course_id,
        course_b_id: requestB.data.from_course_id,
        match_status: 'pending'
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Error creating swap match: ${error.message}`);
    }
    
    await Promise.all([
      supabaseAdmin
        .from('swap_requests')
        .update({ status: 'matched' })
        .eq('id', requestAId),
      supabaseAdmin
        .from('swap_requests')
        .update({ status: 'matched' })
        .eq('id', requestBId)
    ]);
    
    return match;
    
  } catch (error) {
    console.error('Error creating swap match:', error);
    throw error;
  }
};

const processSwapRequest = async (requestId) => {
  try {
    const matches = await findMutualSwapMatches(requestId);
    
    if (matches.length === 0) {
      return { matched: false, matches: [] };
    }
    
    const sortedMatches = matches.sort((a, b) => {
      const priorityDiff = (b.priority || 1) - (a.priority || 1);
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(a.created_at) - new Date(b.created_at);
    });
    
    const bestMatch = sortedMatches[0];
    const swapMatch = await createSwapMatch(requestId, bestMatch.id);
    
    return {
      matched: true,
      match: swapMatch,
      matchedWith: bestMatch
    };
    
  } catch (error) {
    console.error('Error processing swap request:', error);
    throw error;
  }
};

const confirmSwapMatch = async (matchId, studentId) => {
  try {
    const { data: match, error } = await supabaseAdmin
      .from('swap_matches')
      .select(`
        *,
        student_a:profiles!swap_matches_student_a_id_fkey(id, full_name, email, student_id),
        student_b:profiles!swap_matches_student_b_id_fkey(id, full_name, email, student_id)
      `)
      .eq('id', matchId)
      .eq('match_status', 'pending')
      .single();
      
    if (error || !match) {
      throw new Error('Swap match not found or already processed');
    }
    
    if (match.student_a_id !== studentId && match.student_b_id !== studentId) {
      throw new Error('Student not part of this match');
    }

    // Check if this student has already confirmed
    const confirmationField = match.student_a_id === studentId ? 'student_a_confirmed' : 'student_b_confirmed';
    const otherConfirmationField = match.student_a_id === studentId ? 'student_b_confirmed' : 'student_a_confirmed';
    
    // Update confirmation status
    const updateData = {
      [confirmationField]: true,
      confirmed_at: new Date().toISOString()
    };
    
    // If other student already confirmed, mark as fully confirmed
    if (match[otherConfirmationField]) {
      updateData.match_status = 'confirmed';
      updateData.contact_shared_at = new Date().toISOString();
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('swap_matches')
      .update(updateData)
      .eq('id', matchId);
      
    if (updateError) {
      throw new Error('Error confirming swap match');
    }
    
    // If both confirmed, return contact information
    if (match[otherConfirmationField] || updateData.match_status === 'confirmed') {
      const otherStudent = match.student_a_id === studentId ? match.student_b : match.student_a;
      return {
        success: true,
        message: 'Both students confirmed! Contact information is now available.',
        contactInfo: {
          name: otherStudent.full_name,
          email: otherStudent.email,
          studentId: otherStudent.student_id
        },
        status: 'confirmed'
      };
    } else {
      return {
        success: true,
        message: 'Your confirmation recorded. Waiting for the other student to confirm.',
        status: 'waiting_for_other_confirmation'
      };
    }
    
  } catch (error) {
    console.error('Error confirming swap match:', error);
    throw error;
  }
};

const getMatchContactInfo = async (matchId, studentId) => {
  try {
    const { data: match, error } = await supabaseAdmin
      .from('swap_matches')
      .select(`
        *,
        student_a:profiles!swap_matches_student_a_id_fkey(id, full_name, email, student_id),
        student_b:profiles!swap_matches_student_b_id_fkey(id, full_name, email, student_id),
        course_a:courses!swap_matches_course_a_id_fkey(course_code, course_title),
        course_b:courses!swap_matches_course_b_id_fkey(course_code, course_title)
      `)
      .eq('id', matchId)
      .eq('match_status', 'confirmed')
      .single();
      
    if (error || !match) {
      throw new Error('Match not found or not confirmed yet');
    }
    
    if (match.student_a_id !== studentId && match.student_b_id !== studentId) {
      throw new Error('Student not part of this match');
    }
    
    const otherStudent = match.student_a_id === studentId ? match.student_b : match.student_a;
    const yourCourse = match.student_a_id === studentId ? match.course_a : match.course_b;
    const theirCourse = match.student_a_id === studentId ? match.course_b : match.course_a;
    
    return {
      matchId: match.id,
      contactInfo: {
        name: otherStudent.full_name,
        email: otherStudent.email,
        studentId: otherStudent.student_id
      },
      swapDetails: {
        yourCourse: {
          code: yourCourse.course_code,
          title: yourCourse.course_title
        },
        theirCourse: {
          code: theirCourse.course_code,
          title: theirCourse.course_title
        }
      },
      confirmedAt: match.confirmed_at,
      instructions: 'Contact this student to arrange the course swap through your school\'s enrollment system.'
    };
    
  } catch (error) {
    console.error('Error getting match contact info:', error);
    throw error;
  }
};

const markSwapCompleted = async (matchId, studentId) => {
  try {
    const { data: match, error } = await supabaseAdmin
      .from('swap_matches')
      .select('*')
      .eq('id', matchId)
      .eq('match_status', 'confirmed')
      .single();
      
    if (error || !match) {
      throw new Error('Match not found or not in confirmed status');
    }
    
    if (match.student_a_id !== studentId && match.student_b_id !== studentId) {
      throw new Error('Student not part of this match');
    }
    
    // Mark completion status for this student
    const completionField = match.student_a_id === studentId ? 'student_a_completed' : 'student_b_completed';
    const otherCompletionField = match.student_a_id === studentId ? 'student_b_completed' : 'student_a_completed';
    
    const updateData = {
      [completionField]: true
    };
    
    // If other student also marked completed, mark entire match as completed
    if (match[otherCompletionField]) {
      updateData.match_status = 'completed';
      updateData.completed_at = new Date().toISOString();
      
      // Mark swap requests as completed
      await Promise.all([
        supabaseAdmin
          .from('swap_requests')
          .update({ status: 'completed' })
          .eq('id', match.request_a_id),
        supabaseAdmin
          .from('swap_requests')
          .update({ status: 'completed' })
          .eq('id', match.request_b_id)
      ]);
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('swap_matches')
      .update(updateData)
      .eq('id', matchId);
      
    if (updateError) {
      throw new Error('Error marking swap as completed');
    }
    
    return {
      success: true,
      message: updateData.match_status === 'completed' 
        ? 'Swap marked as completed by both students!' 
        : 'Your completion recorded. Waiting for other student to confirm completion.'
    };
    
  } catch (error) {
    console.error('Error marking swap completed:', error);
    throw error;
  }
};

const batchProcessSwaps = async () => {
  try {
    const { data: activeRequests, error } = await supabaseAdmin
      .from('swap_requests')
      .select('id')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());
      
    if (error) {
      throw new Error('Error fetching active requests');
    }
    
    const results = [];
    
    for (let request of activeRequests) {
      try {
        const result = await processSwapRequest(request.id);
        results.push({ requestId: request.id, ...result });
      } catch (error) {
        results.push({ 
          requestId: request.id, 
          matched: false, 
          error: error.message 
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Error in batch processing swaps:', error);
    throw error;
  }
};

module.exports = {
  findMutualSwapMatches,
  processSwapRequest,
  createSwapMatch,
  confirmSwapMatch,
  getMatchContactInfo,
  markSwapCompleted,
  batchProcessSwaps,
  canSwapWithoutConflicts,
  checkTimeConflicts,
  getStudentSchedule
};