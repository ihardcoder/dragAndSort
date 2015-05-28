var dragmodule = (function($) {
	var EnableDrag = {
		$container: null,
		$individualRows: null, //官方频道可排序抽屉
		$individualBanners: null,
		$subscribeBox: null,
		$inheritRows: null, //订阅频道可排序抽屉
		$inheritBanners: null,
		$itemRows: null, //所有可排序抽屉
		$btnTotop: null, //置顶按钮
		$moduleOnTop: null, //顶部抽屉

		$dragScar: null,

		$userSubscripe: null,

		individualSum: 0,
		inheritSum: 0,
		itemSum: 0,

		// 被拖动原始抽屉
		$focusOrigin: null,
		$focusBannerOrigin: null,

		// 拖动列表
		$vList: null,
		$vListBox: null,
		$vDragblank: null,
		$vListPrevBanner: null,
		$vListNextBanner: null,

		// setTimeout计时器
		pressTimer: null,
		sortTimer: null,
		orderTimer: null,

		// 动画执行时间初始值
		slideTime: 400,
		aniTime: undefined,

		focusOrder: null,
		startIndex: null,
		endIndex: null,

		isFoused: false,

		focusOrdinate: null,
		firstOffset: null,
		lastOffset: null,
		listOffset: null,

		boxOffset: null, //container的offset
		topOffset: null, //顶部抽屉的offset

		windowH: 0,
		windowW: 0,

		unitHeight: 150,

		dragDest: 0,

		// 拖拽列表上下滚动的边界值
		scrollUpEdge: undefined,
		scrollDownEdge: undefined,

		// 拖拽列表是否可以上下滚动，默认true
		scrollupable: true,
		scrolldownable: true,

		ClassRowIndex: "drawer drawer_subscribe dragmodule",
		ClassOnTop: "dragmodule-top",

		eTop: 0,
		eBottom: 0,
		// 未被拖动的item尺寸
		listItemSize: {
			width: 40,
			height: 40,
			zoom: 0.5,
			marginBottem: 10
		},
		// 被拖动的item尺寸
		focusItemSize: {
			width: 80,
			height: 80,
			zoom: 1,
			marginBottem: 10
		},
		
		// 拖拽结束的回调函数
		callback: null,
		// 浏览器类型及版本
		UA: null,
		/*****
		 *初始化参数
		 *isbind:是否绑定拖拽事件
		 *enableToTop:是否绑定置顶功能事件
		 *fn:拖拽排序后的回调函数
		 *****/
		init: function(isbind, enableToTop, fn) {
			var _this = this;

			if (fn && typeof fn === "function") {
				this.callback = fn;
			}

			this.unBind();

			this.$userSubscripe = $(".yk-subscipe-user");
			this.$container = $(".container");
			// 官方频道
			this.$individualRows = $(".dragmodule[drag-mode=individual]:visible");
			this.$individualBanners = this.$individualRows.find(".drag-banner");
			this.individualSum = this.$individualRows.length;
			// 订阅频道
			this.$subscribeBox = $(".dragmodule[drag-mode=container]");
			this.$inheritRows = this.$subscribeBox.find(".dragmodule[drag-mode=inherit]:visible");
			this.$inheritBanners = this.$inheritRows.find(".drag-banner");
			this.inheritSum = this.$inheritRows.length;

			this.itemSum = this.individualSum + this.inheritSum;
			// 所有可拖拽抽屉
			this.$itemRows = $($.merge($.merge([], this.$individualRows), this.$inheritRows));
			// 初始化抽屉order属性
			this.$itemRows.each(function(i) {
				$(this).attr("drag-order", i);
			});
			// 拖动热区：头图
			this.$banners = $($.merge($.merge([], this.$individualBanners), this.$inheritBanners));
			// 拖动热区：抽屉顶部
			this.$dragScar = this.$itemRows.find(".drag-scar");
			// 置顶按钮
			this.$btnTotop = this.$itemRows.find(".drag-totop");

			$(this.$itemRows[0]).addClass(_this.ClassOnTop);
			this.$moduleOnTop = $(this.$itemRows[0]);
			this.topOffset = this.$moduleOnTop.position();

			this.windowW = $(window).width();
			this.windowH = $(window).height();

			this.UA = this.getUA();
			if (this.UA.ie && parseInt(_this.UA.ie) < 8) {
				isbind = false;
			}
			if (isbind && this.$individualRows.length != 0) {
				this.bind(enableToTop);
			}
		},
		/*****
		 *绑定长按事件呼出拖拽列表
		 *****/
		bind: function(enableToTop) {
			var _this = this;
			// 监听浏览器窗口大小变化
			$(window).resize(function(event) {
				_this.windowH = $(this).height();
				_this.windowW = $(this).width();
			});
			// 置顶功能监听
			if (enableToTop) {
				this.$btnTotop.on("click", function(e) {
					var ev = e || window.event;
					if (ev.preventDefault) {
						ev.preventDefault();
						ev.stopPropagation();
					}
					_this.toTop($(this));
				});
			}
			// 添加火车头拖拽事件
			this.$banners.on("mousedown", function(e) {
				var ev = e || window.event;
				if (ev.preventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}
				_this.focusOrdinate = {
					top: ev.clientY,
					left: ev.clientX
				};
				_this.$focusOrigin = $(this).parents(".dragmodule[drag-mode!=container]");
				// 只有一个官频时不生成拖动列表
				if (_this.$focusOrigin.attr("drag-mode") === "individual" && _this.$individualRows.length <= 1) {
					return;
				}
				_this.$focusBannerOrigin = $(this);
				_this.$focusBannerOrigin.addClass('dragging');
				if (_this.pressTimer) {
					clearTimeout(_this.pressTimer);
				}
				// 长按呼出拖拽列表
				_this.pressTimer = setTimeout(function() {
					_this.isFoused = true;
					_this.generateList();
				}, 200);
			}).on("mouseup", function(e) {
				var ev = e || window.event;
				if (ev.preventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}
				// 未达到长按触发时间则清除事件
				if (_this.pressTimer) {
					clearTimeout(_this.pressTimer);
				}
			});
			// 添加抽屉顶部拖拽事件
			this.$dragScar.on("mousedown", function(e) {
				var ev = e || window.event;
				if (ev.preventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}
				_this.focusOrdinate = {
					top: ev.clientY,
					left: ev.clientX
				};
				_this.$focusOrigin = $(this).parents(".dragmodule[drag-mode!=container]");
				// 只有一个官频时不生成拖动列表
				if (_this.$focusOrigin.attr("drag-mode") === "individual" && _this.$individualRows.length <= 1) {
					return;
				}
				_this.$focusBannerOrigin = _this.$focusOrigin.find(".drag-banner");
				_this.$focusBannerOrigin.addClass('dragging');
				if (_this.pressTimer) {
					clearTimeout(_this.pressTimer);
				}
				// 长按呼出拖拽列表
				_this.pressTimer = setTimeout(function() {
					_this.isFoused = true;
					_this.generateList();
				}, 100);
			}).on("mouseup", function(e) {
				var ev = e || window.event;
				if (ev.preventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}
				// 未达到长按触发时间则清除事件
				if (_this.pressTimer) {
					clearTimeout(_this.pressTimer);
				}
			});
			this.$userSubscripe.on("mouseover", function(e) {
				var ev = e || window.event;
				if (ev.preventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}
				$(this).addClass('yk-subscipe-user-hover');
			}).on("mouseleave", function(e) {
				var ev = e || window.event;
				if (ev.preventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}
				$(this).removeClass('yk-subscipe-user-hover');
			});
		},
		/*****
		 *生成拖拽列表
		 *****/
		generateList: function() {
			var _this = this;
			var $_banner, $_clone, $_entry, $_item;
			this.$vList = $("<div class='yk-draglist' ></div>").appendTo(_this.$container);
			this.$vListBox = $("<div class='box'></div>").appendTo(_this.$vList);
			this.$vListUl = $("<ul class='list'></ul>").appendTo(_this.$vListBox);
			this.$vList.on("selectstart", function() {
				return false;
			});
			if (!(this.$focusOrigin.attr("drag-mode") === "inherit")) {
				this.$individualBanners.each(function(i) {
					$_banner = $(this).find(".drag-tag");
					$_clone = $_banner.clone();
					$_entry = $("<span class='entry'></span>");
					$_item = $("<li class='dragitem'></li>");
					$_entry.html($_banner.attr("drag-name"));
					if ($(this).hasClass('dragging')) {
						$_item.addClass('dragging');
						$_clone.css({
							zoom: _this.focusItemSize.zoom,
							"-moz-transform": "scale(" + _this.focusItemSize.zoom + ")",
							"-moz-transform-origin": "top left",
							marginBottem: _this.focusItemSize.marginBottem + "px"
						});
					} else {
						$_clone.css({
							zoom: _this.listItemSize.zoom,
							"-moz-transform": "scale(" + _this.listItemSize.zoom + ")",
							"-moz-transform-origin": "top left",
							marginBottem: _this.listItemSize.marginBottem + "px"
						});
					}
				
					$_clone.appendTo($_item);
					$_entry.appendTo($_item);
					$_item.data("order", i).appendTo(_this.$vListUl);
				});
			} else {
				this.$individualBanners.each(function(i) {
					$_banner = $(this).find(".drag-tag");
					$_clone = $_banner.clone().addClass("ico");
					$_entry = $("<span class='entry'></span>");
					$_item = $("<li class='dragitem'></li>");
					$_entry.html($_banner.attr("drag-name"));
					$_clone.css({
						zoom: _this.listItemSize.zoom,
						"-moz-transform": "scale(" + _this.focusItemSize.zoom + ")",
						"-moz-transform-origin": "top left",
						marginBottem: _this.listItemSize.marginBottem + "px"
					});
					
					$_clone.appendTo($_item);
					$_entry.appendTo($_item);
					$_item.data("order", i).appendTo(_this.$vListUl);
				});
				$_banner = this.$focusBannerOrigin.find("img");
				$_clone = $_banner.clone().addClass("ico");
				$_entry = $("<span class='entry'></span>");
				$_item = $("<li class='dragitem'></li>");
				$_entry.html($_banner.attr("alt"));
				$_item.addClass('dragging');
				$_clone.css({
					width: _this.focusItemSize.width + "px",
					height: _this.focusItemSize.height + "px",
					marginBottem: _this.focusItemSize.marginBottem + "px"
				});
				$_clone.appendTo($_item);
				$_entry.appendTo($_item);
				$_item.data("order", _this.individualSum).appendTo(_this.$vListUl);
			}
			// 空白节点拖动占位
			this.$vDragblank = $("<li></li>").addClass("dragitem dragitem-blank").appendTo(_this.$vListUl);
			//上下翻页标志 
			this.$vListPrevBanner = $("<div class='dragbanner dragbanner-prev'><span class='banner banner-prev'></span></div>").appendTo(_this.$vListBox);
			this.$vListNextBanner = $("<div class='dragbanner dragbanner-next'><span class='banner banner-next'></span></div>").appendTo(_this.$vListBox);

			this.formatList();
		},
		/*****
		 *重新计算拖拽列表每个item的绝对定位坐标
		 *****/
		formatList: function() {
			var _this = this;
			var $focus = this.$vList.find(".dragging"),
				$nonfocuses = this.$vList.find(".dragitem").not(".dragging").not(".dragitem-blank");
			// 临时变量存储全局变量，优化查找
			var itemH = this.listItemSize.height,
				itemW = this.listItemSize.width,
				itemM = this.listItemSize.marginBottem;
			var focusH = this.focusItemSize.height,
				focusW = this.focusItemSize.width,
				focusM = this.focusItemSize.marginBottem;
			var _left = this.listItemSize.width/2;
			// 记录当前被拖动节点坐标
			var focusTop = this.focusOrdinate.top - focusH / 2,
				focusLeft = this.focusOrdinate.left - focusW / 2;
			var nonfocusSum = $nonfocuses.length;
			this.focusOrder = $focus.data("order");
			this.startIndex = this.focusOrder;
			this.$vList.show().css({
				opacity: 0
			});
			$focus.css({
				position: "absolute",
				top: focusTop + "px",
				left: 0
			}).removeClass('dragitem').removeData('order');
			$nonfocuses.each(function(i) {
				var order = $(this).data("order");
				var oTop = undefined;
				if (order > _this.focusOrder) {
					oTop = focusTop + focusH + (itemH + itemM) * (order - 1 - _this.focusOrder);
				} else {
					oTop = focusTop - (itemH + itemM) * (_this.focusOrder - order);
				}
				$(this).css({
					position: "absolute",
					top: oTop + "px",
					left: 0
				});
				if (i === 0) {
					_this.firstOffset = {
						top: oTop,
						left: 0
					};
					if (order > _this.focusOrder) {
						_this.firstOffset = {
							top: oTop - focusH - focusM,
							left: 0
						};
					}
					if (oTop < 0) {
						_this.$vListPrevBanner.show();
					}
				}
				if (i === nonfocusSum - 1) {
					_this.lastOffset = {
						top: oTop,
						left: 0
					};
					if (oTop + _this.listItemSize.height - _this.windowH > 0) {
						_this.$vListNextBanner.show();
					}
				}
			});

			this.$vDragblank.css({
				width: _this.focusItemSize.width + "px",
				height: _this.focusItemSize.height + "px",
				marginBottem: _this.focusItemSize.marginBottem + "px",
				position: "absolute",
				top: focusTop + "px",
				left: 0
			}).data("order", _this.focusOrder).insertBefore($focus).show();
			this.showList();
			this.listOffset = this.$vListUl.offset();

			this.setScrollEdge();
			$(document).on("mousemove", function(e) {
				var ev = e || window.event;
				if (ev.preventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}
				var eOrdination = {
					top: ev.clientY,
					left: ev.clientX
				};
				_this.eTop = eOrdination.top - _this.focusItemSize.height / 2;
				_this.eBottom = eOrdination.top + _this.focusItemSize.height / 2;
				$focus.css({
					position: "fixed",
					top: _this.eTop + "px",
					left: _this.listOffset.left  + "px"
				});
				clearTimeout(_this.orderTimer);
				_this.orderTimer = setTimeout(function() {
					_this.order();
				}, 0);
			}).on("mouseup", function(e) {
				$(_this.$banners).unbind("mousemove");

				_this.endIndex = _this.$vDragblank.data("order");
				_this.dragDest = parseInt(_this.endIndex);
				if (_this.endIndex !== _this.startIndex) {
					if (_this.endIndex === 0) {
						_this.sortOrigin(_this.$focusOrigin[0], _this.$itemRows[0], 0, false);
					} else if (_this.endIndex === _this.itemSum) {
						_this.sortOrigin(_this.$focusOrigin[0], _this.$itemRows[_this.itemSum - 1], 1, false);
					} else {
						if (_this.startIndex > _this.endIndex) {
							_this.endIndex--;
							_this.sortOrigin(_this.$focusOrigin[0], _this.$itemRows.parent().find("[drag-order=" + _this.endIndex + "]")[0], 1, false);
						} else {
							_this.sortOrigin(_this.$focusOrigin[0], _this.$itemRows.parent().find("[drag-order=" + _this.endIndex + "]")[0], 1, true);
						}
						if (_this.$focusOrigin.hasClass('drawer_subscribe')) {
							_this.$focusOrigin.removeClass("yk-row yk-row-b30").attr("drag-mode", "individual");
						}
					}
				}
				_this.$vDragblank.removeData('order').hide();

				setTimeout(function() {
					_this.hideList();
					_this.init(true);
					_this.$banners.removeClass('dragging');
					$(document).unbind("mousemove mouseup");
				}, 100);
			});
		},
		/*****
		 *对每个item的order重新排序
		 *****/
		order: function() {
			var _this = this;
			var $focus = this.$vList.find(".dragging"),
				$nonfocuses = this.$vList.find(".dragitem").not(".dragging");
			var itemH = this.listItemSize.height,
				itemW = this.listItemSize.width,
				itemM = this.listItemSize.marginBottem;
			var focusH = this.focusItemSize.height,
				focusW = this.focusItemSize.width,
				focusM = this.focusItemSize.marginBottem;
			var focusTop = 0,
				iTop = 0;
			var iOrder;
			var sum = $nonfocuses.length;

			$nonfocuses.each(function(i) {
				focusTop = $focus.offset().top;
				iTop = $(this).offset().top;
				iOrder = $(this).data("order");
				if (_this.focusOrder > iOrder && focusTop + focusH / 2 < iTop + itemH / 2) {
					// 从下往上拖动，上边item下移
					_this.focusOrder = iOrder;
					_this.$vDragblank.insertBefore($(this));
				} else if (_this.focusOrder < iOrder && focusTop + focusH / 2 > iTop + itemH / 2) {
					// 从上往下拖动，下边item上移
					_this.focusOrder = iOrder;
					_this.$vDragblank.insertAfter($(this));
				}
				if (i === sum - 1) {
					_this.formatOrder();
				}
			});
		},
		/*****
		 *拖动结束重新对order排序
		 *****/
		formatOrder: function() {
			var _this = this;
			var $dragitems = this.$vList.find(".dragitem").not(".dragging");
			var sum = $dragitems.length;
			$dragitems.each(function(i) {
				$(this).data("order", i);
				if (i == sum - 1) {
					_this.sort();
				}
			});
		},
		/*****
		 *对拖拽列表的item按order排序
		 *****/
		sort: function(isReleaze) {
			var _this = this;
			var $dragitems = this.$vList.find(".dragitem");
			var itemH = this.listItemSize.height,
				itemM = this.listItemSize.marginBottem;
			var focusH = this.focusItemSize.height,
				focusM = this.focusItemSize.marginBottem;
			var sum = $dragitems.length;
			$dragitems.each(function(i) {
				var order = $(this).data("order");
				if (order <= _this.focusOrder) {
					$(this).css({
						position: "absolute",
						top: (itemH + itemM) * $(this).data("order") + _this.firstOffset.top + "px"
					});
				} else {
					$(this).css({
						position: "absolute",
						top: (itemH + itemM) * (order - 1) + focusH + focusM + _this.firstOffset.top + "px"
					});
				}
				if (i === sum - 1) {
					setTimeout(function() {
						_this.scrollList();
					}, 0);
				}
			});
		},
		/*****
		 *鼠标移到上下边界是滚动拖拽列表
		 *****/
		scrollList: function() {
			var _this = this;
			var listTop = this.$vListUl.position().top;
			var $items = this.$vListUl.find(".dragitem").not(".dragitem-blank");
			var topItem = $items[0],
				lastItem = $items[$items.length - 1];
			// 如果列表有item在可视区域顶部以外，显示上翻页banner	
			if (topItem.getBoundingClientRect().top < 0) {
				this.$vListPrevBanner.show();
			}
			// 如果列表有item在可视区域底部以外，显示下翻页banner
			if (this.windowH - lastItem.getBoundingClientRect().top - this.listItemSize.height < 0) {
				this.$vListNextBanner.show();
			}
			// 触发列表滚动的坐标边界，根据翻页banner尺寸，定为70px
			if (this.scrolldownable && this.eTop < 70 && _this.$vDragblank.data("order") >= 2 && listTop < this.scrollDownEdge) {
				// scroll down
				this.$vListUl.css({
					top: "+=" + (_this.focusItemSize.height + _this.focusItemSize.marginBottem) + "px"
				});
				// 列表滚动后重新计算列表top值，并判断翻页banner是否显示
				listTop = this.$vListUl.position().top;
			} else if (this.scrollupable && this.eBottom > _this.windowH - 70 && _this.$vDragblank.data("order") <= _this.itemSum - 3 && listTop > this.scrollUpEdge) {
				// scroll up
				_this.$vListUl.css({
					top: "-=" + (_this.focusItemSize.height + _this.focusItemSize.marginBottem) + "px"
				});
				listTop = _this.$vListUl.position().top;
			}
		},
		/*****
		 *改变原页面抽屉位置
		 *****/
		sortOrigin: function(origin, dest, type, isUpToDown) {
			var _this = this;

			if (origin != dest) {
				var $origin = $(origin),
					$dest = $(dest);
				var originH = $origin.height(),
					originW = $origin.width(),
					originMargin = parseInt($origin.css("margin-bottom").split("px")[0]);
				var destH, destMargin;
				var iOffset = $origin.position();
				var _flyToPos = $dest.position().top;

				if (type === 1) {
					if ($dest.next(".dragmodule:visible").length != 0) {
						_flyToPos = $dest.next(".dragmodule:visible").position().top;
					} else {
						destH = $dest.height();
						destMargin = parseInt($dest.css("margin-bottom").split("px")[0]);
						_flyToPos = _flyToPos + destH + destMargin;
					}

				}
				if (isUpToDown) {
					_flyToPos -= (originH + originMargin);
				}
				this.$container.css("position", "relative");
				// 克隆节点做漂浮动画
				var $clone = $origin.clone().css({
					position: "absolute",
					top: iOffset.top + "px",
					width: originW + "px",
					height: originH + "px",
					zIndex: 200,
					display: "none"
				}).appendTo(_this.$container);
				// 空白节点做占位
				var __blank = $("<div></div>");

				// 计算漂浮层动画时间
				this.aniTime = this.slideTime * Math.round(Math.abs(iOffset.top - _flyToPos) / _this.unitHeight);
				// 上限不超过800ms
				if (this.aniTime > 800) {
					this.aniTime = 800;
				}
				// 订阅子栏位被置顶后设为独立可拖动节点
				if ($origin.attr("drag-mode") === "inherit") {
					$origin.attr({
						"drag-mode": "individual",
						"class": _this.ClassRowIndex
					});
				}

				// 空白节点占位原节点位置
				__blank.css({
					height: originH + originMargin + "px",
					marginBottom: 0,
					width: originW + "px",
					overflow: "hidden",
					visibility: "hidden",
					opacity: 0
				}).insertBefore($origin);
				// 原节点被位移至目标位置
				switch (type) {
					case 0:
						$origin.css({
							height: 0,
							marginBottom: 0,
							opacity: 0
						}).insertBefore($dest);
						break;
					case 1:
						$origin.css({
							height: 0,
							marginBottom: 0,
							opacity: 0
						}).insertAfter($dest);
						break;
				}

				// 占位节点与原节点动画保持同步
				__blank.animate({
					height: 0
				}, _this.slideTime, function() {
					$(this).remove();
				});
				$origin.animate({
					height: originH + originMargin + "px",
					opacity: 1
				}, _this.slideTime, function() {
					$(this).css({
						height: originH + "px",
						marginBottom: originMargin + "px"
					});
				});
				// 漂浮动画
				$clone.css({
					display: "block",
					opacity: 1
				}).animate({
					opacity: 0.1,
					top: _flyToPos + "px"
				}, _this.aniTime, function() {
					$(this).remove();
					_this.excuteCallback();
					// 因排序产生顺序重排，动画完毕后重新初始化参数
					_this.init(true);
					_this.getOnTop();
				});
			}
		},
		/*****
		 *计算列表上下偏移范围
		 *****/
		setScrollEdge: function() {
			var firstTop = this.firstOffset.top,
				lastTop = this.lastOffset.top + this.listItemSize.height - this.windowH;
			this.blankArea = this.focusItemSize.height + this.focusItemSize.marginBottem;
			if (firstTop <= 0) {
				this.scrollDownEdge = Math.abs(firstTop) + this.blankArea;
			} else if (firstTop > 0) {
				this.scrollDownEdge = this.blankArea - firstTop > 0 ? this.blankArea - firstTop : 0;
			}
			if (lastTop >= 0) {
				this.scrollUpEdge = -(lastTop + this.blankArea);
			} else if (lastTop < 0) {
				this.scrollUpEdge = -(this.blankArea - Math.abs(lastTop) > 0 ? this.blankArea - Math.abs(lastTop) : 0);
			}
		},
		/*****
		 *置顶功能
		 *btn:置顶按钮
		 *fn:置顶完成后的回调函数
		 *****/
		toTop: function(btn, fn) {
			var _this = this;
			var callback = null;
			if (fn && typeof fn === "function") {
				callback = fn;
			}
			var $row = btn.parents(".dragmodule[drag-mode!=container]:visible");
			var $target = this.$moduleOnTop;
			var _flyToPos = this.topOffset.top;
			// IE6无动画
			if (!!window.ActiveXObject && !window.XMLHttpRequest) {
				$row.insertBefore($target);
				return;
			}
			var rowH = $row.height(),
				rowW = $row.width(),
				rowMargin = parseInt($row.css("margin-bottom").split("px")[0]);
			var iOffset = $row.position();
			// 广告弹出，每次点击需重新计算位置
			_this.getOnTop();

			if (iOffset.top === _this.topOffset.top) {
				return;
			}

			// 克隆节点做漂浮动画
			var $clone = $row.clone().css({
				position: "absolute",
				top: iOffset.top + "px",
				width: rowW + "px",
				height: rowH + "px",
				zIndex: 200,
				display: "none"
			}).appendTo(_this.$container);
			// 空白节点做占位
			var __blank = $("<div></div>");

			_this.$container.css("position", "relative");

			// 计算漂浮层动画时间
			_this.aniTime = _this.slideTime * Math.round((iOffset.top - _this.topOffset.top) / _this.unitHeight);
			// 上限不超过800ms
			if (_this.aniTime > 800) {
				_this.aniTime = 800;
			}
			// 订阅子栏位被置顶后设为独立可拖动节点
			if ($row.attr("drag-mode") === "inherit") {
				$row.attr({
					"drag-mode": "individual",
					"class": _this.ClassRowIndex
				});
			}
			$("." + _this.ClassOnTop).removeClass(_this.ClassOnTop);
			$row.addClass(_this.ClassOnTop);

			// 空白节点占位原节点位置
			__blank.css({
				height: rowH + rowMargin + "px",
				marginBottom: 0,
				width: rowW + "px",
				overflow: "hidden",
				visibility: "hidden",
				opacity: 0
			}).insertBefore($row);
			// 原节点被置顶

			$row.css({
				height: 0,
				marginBottom: 0,
				opacity: 0
			}).insertBefore($target);

			_this.$moduleOnTop = $row;

			// 占位节点与原节点动画保持同步
			__blank.animate({
				height: 0
			}, _this.slideTime, function() {
				$(this).remove();
			});
			$row.animate({
				height: rowH + rowMargin + "px",
				opacity: 1
			}, _this.slideTime, function() {
				$(this).css({
					height: rowH + "px",
					marginBottom: rowMargin + "px"
				});
				_this.init(true);
			});
			// 漂浮动画
			$clone.css({
				display: "block",
				opacity: 1
			}).animate({
				opacity: 0.2,
				top: _flyToPos + "px"
			}, _this.aniTime, function() {
				$(this).remove();
				if (callback) {
					callback();
				}
			});
		},
		/*****
		 *重新获取置顶抽屉
		 *****/
		getOnTop: function() {
			var _this = this;
			this.$itemRows = this.$container.find(".dragmodule[drag-mode!=container]:visible");
			this.$itemRows.removeClass(_this.ClassOnTop);
			$(this.$itemRows[0]).addClass(_this.ClassOnTop);
			this.$moduleOnTop = $(this.$itemRows[0]);
			this.topOffset = this.$moduleOnTop.position();
		},
		/*****
		 *执行回调函数
		 *****/
		excuteCallback: function() {
			if (this.callback) {
				this.callback();
			}
		},
		/*****
		 *显示拖拽列表
		 *****/
		showList: function() {
			this.$vList.show().animate({
				opacity: 1
			}, 200);
		},
		/*****
		 *移除拖拽列表
		 *****/
		hideList: function() {
			this.$vList.fadeOut(200, function() {
				$(this).remove();
			});
		},
		/*****
		 *判断浏览器类型及版本
		 *****/
		getUA: function() {
			var Sys = {};
			var ua = navigator.userAgent.toLowerCase();
			var s;
			(s = ua.match(/rv:([\d.]+)\) like gecko/)) ? Sys.ie = s[1]:
				(s = ua.match(/msie ([\d.]+)/)) ? Sys.ie = s[1] :
				(s = ua.match(/firefox\/([\d.]+)/)) ? Sys.firefox = s[1] :
				(s = ua.match(/chrome\/([\d.]+)/)) ? Sys.chrome = s[1] :
				(s = ua.match(/opera.([\d.]+)/)) ? Sys.opera = s[1] :
				(s = ua.match(/version\/([\d.]+).*safari/)) ? Sys.safari = s[1] : 0;
			return Sys;
		},
		/*****
		 *重新初始化
		 *****/
		unBind: function() {
			if (this.$banners && this.$banners.length != 0) {
				this.$banners.unbind("mousedown mouseup");
			}
			if (this.$dragScar && this.$dragScar.length != 0) {
				this.$dragScar.unbind("mousedown mouseup");
			}
		}
	}
	return EnableDrag;
})(jQuery || window.jQuery);