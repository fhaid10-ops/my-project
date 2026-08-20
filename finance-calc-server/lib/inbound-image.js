/**
 * صور واتساب: لا رد آلي من البوت.
 */
function shouldIgnoreInboundImage({ isImage } = {}) {
  return Boolean(isImage);
}

function shouldReplyToInboundImage({ isImage } = {}) {
  return !shouldIgnoreInboundImage({ isImage });
}

module.exports = { shouldIgnoreInboundImage, shouldReplyToInboundImage };
