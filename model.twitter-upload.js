/**
 * Model.Twitter Upload for Tombloo
 *
 * @version : 1.2
 * @date    : 2011-11-20
 * @author  : YungSang (http://yungsang.com/+)
 *
 * [Tombloo]: https://github.com/to/tombloo/wiki
 */
(function() {
	const TWITTER_MODEL_NAME = 'Twitter';

	addAround(models[TWITTER_MODEL_NAME], 'check', function(proceed, args) {
		let ps = args[0], result = proceed(args);
		if (!result && ps) {
			result = /(?:regular|photo|quote|link|conversation|video)/.test(ps.type);
		}
		return result;
	});

	addAround(models[TWITTER_MODEL_NAME], 'post', function(proceed, args, self) {
		let ps = args[0];
		if (ps.type === 'photo') {
			return self.download(ps).addCallback(function(file) {
				return self.upload(ps, file);
			});
		}
		return proceed(args);
	});

	update(models[TWITTER_MODEL_NAME], {
		download : function(ps) {
			return (ps.file ? succeed(ps.file) : download(ps.itemUrl, getTempDir()));
		},
		upload : function(ps, file) {
			var self = this;
			var POST_URL = 'https://upload.twitter.com/1/statuses/update_with_media.json';

			var status = joinText([ps.description, (ps.body)? '"' + ps.body + '"' : '', ps.item, ps.pageUrl], ' ');

			return maybeDeferred((status.length < 140) ?
				status : shortenUrls(status, models[this.SHORTEN_SERVICE])
			).addCallback(function(shortend) {
				status = shortend;
				return self.getToken();
			}).addCallback(function(token) {
				var bis = new BinaryInputStream(IOService.newChannelFromURI(createURI(file)).open());

				return request(POST_URL, {
					sendContent : {
						status                  : status,
						'media_data[]'          : btoa(bis.readBytes(file.fileSize)),
						include_entities        : 'true',
						post_authenticity_token : token.authenticity_token
					},
					headers : {
						Referer            : 'https://upload.twitter.com/receiver.html',
						'X-Phx'            : true,
						'X-Requested-With' : 'XMLHttpRequest'
					}
				}).addCallback(function(res) {
					var json = JSON.parse(res.responseText);
					if (json.error) {
						throw new Error(json.error);
					}
					return json;
				});
			});
		}
	});
})();