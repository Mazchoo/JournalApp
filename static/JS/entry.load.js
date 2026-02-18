
let loadServerRenderedImage = function(index, imageId) {
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    $.ajax({
        type: 'POST',
        url: DOWNSIZED_IMAGE_URL,
        data: {
            "image_id": imageId,
            "csrfmiddlewaretoken": csrftoken,
        },
        success: function(response) {
            if ("base64" in response) {
                $("#image" + index).attr("src", response["base64"]);
            }
            if ("error" in response) {
                console.log('Image load error:', response["error"]);
            }
        },
        error: function(_jqXhr, _textStatus, errorThrown) {
            console.log('Failed to load image:', errorThrown);
        }
    });
}


let loadServerRenderedVideo = function(index, videoId) {
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    $.ajax({
        type: 'POST',
        url: DOWNSIZED_VIDEO_IMAGE_URL,
        data: {
            "video_id": videoId,
            "csrfmiddlewaretoken": csrftoken,
        },
        success: function(response) {
            if ("base64" in response) {
                $("#image" + index).attr("src", response["base64"]);
            }
            if ("error" in response) {
                console.log('Video image load error:', response["error"]);
            }
        },
        error: function(_jqXhr, _textStatus, errorThrown) {
            console.log('Failed to load video image:', errorThrown);
        }
    });
}


let initializeServerRenderedContent = function() {
    // Initialize TinyMCE and event handlers on server-rendered paragraphs
    $('.paragraph-entry').each(function() {
        let textarea = $(this).find('textarea.entry-text')[0];
        if (!textarea) return;
        let index = textarea.id.replace('paragraph', '');
        let height = parseInt(textarea.getAttribute('data-height')) || 220;
        initializeNewParagraph(index, height);
    });

    // Initialize event handlers and async loading on server-rendered images/videos
    $('.image-entry').each(function() {
        let img = $(this).find('img')[0];
        if (!img) return;
        let index = img.id.replace('image', '');
        initializeNewImage(index);

        let imageId = img.getAttribute('data-image-id');
        if (imageId) {
            loadServerRenderedImage(index, imageId);
        }

        let videoId = img.getAttribute('data-video-id');
        if (videoId) {
            loadServerRenderedVideo(index, videoId);
        }
    });

    window.scrollTo(0, 0);
}
