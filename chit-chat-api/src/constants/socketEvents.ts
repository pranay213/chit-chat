export const SocketEvents = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_CHAT: 'joinChat',
  LEAVE_CHAT: 'leaveChat',
  SEND_MESSAGE: 'sendMessage',
  MESSAGE: 'message',
  TYPING: 'typing',
  STOP_TYPING: 'stopTyping',
  MESSAGE_READ: 'messageRead',
  MESSAGE_DELIVERED: 'messageDelivered',
  USER_STATUS_UPDATE: 'userStatusUpdate',
  USER_PROFILE_UPDATED: 'userProfileUpdated',
  // WebRTC Video Call Events
  CALL_USER: 'callUser',
  INCOMING_CALL: 'incomingCall',
  ANSWER_CALL: 'answerCall',
  CALL_ACCEPTED: 'callAccepted',
  REJECT_CALL: 'rejectCall',
  CALL_REJECTED: 'callRejected',
  END_CALL: 'endCall',
  CALL_ENDED: 'callEnded',
  WEBRTC_ICE_CANDIDATE: 'webrtcIceCandidate'
};
