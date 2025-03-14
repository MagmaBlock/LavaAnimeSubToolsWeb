// 依赖包
import srtParser2 from "srt-parser-2";
import ClipboardJS from "clipboard";

// 新建一个解析器
const parser = new srtParser2();
// 创建一个复制器实例
const clipboard = new ClipboardJS("#copy");

// 各个设置元素
var customBracketStyle = document.getElementById("customBracketStyle");
var quoteReplace = document.getElementById("quoteReplace");
var aegisub = document.getElementById("aegisub");
var bracketStyle = document.getElementById("bracketStyle");
var spaceReplace = document.getElementById("spaceReplace");

// 从本地存储读取设置
localStorage.removeItem("config");
customBracketStyle.value =
  localStorage.getItem("customBracketStyle") !== null
    ? localStorage.getItem("customBracketStyle")
    : "";
quoteReplace.checked =
  localStorage.getItem("quoteReplace") !== null
    ? JSON.parse(localStorage.getItem("quoteReplace"))
    : false;
aegisub.checked =
  localStorage.getItem("aegisub") !== null
    ? JSON.parse(localStorage.getItem("aegisub"))
    : false;
bracketStyle.checked =
  localStorage.getItem("bracketStyle") !== null
    ? JSON.parse(localStorage.getItem("bracketStyle"))
    : true;
spaceReplace.checked =
  localStorage.getItem("spaceReplace") !== null
    ? JSON.parse(localStorage.getItem("spaceReplace"))
    : false;
saveConfig();
console.log("读取设置：", localStorage);

function saveConfig() {
  localStorage.setItem("customBracketStyle", customBracketStyle.value);
  localStorage.setItem("quoteReplace", quoteReplace.checked);
  localStorage.setItem("aegisub", aegisub.checked);
  localStorage.setItem("bracketStyle", bracketStyle.checked);
  localStorage.setItem("spaceReplace", spaceReplace.checked);
}

// 保存设置
customBracketStyle.addEventListener("input", saveConfig);
let checkBoxList = [quoteReplace, aegisub, bracketStyle, spaceReplace];
checkBoxList.forEach((item) => {
  item.addEventListener("change", saveConfig);
});

// 复制事件处理
clipboard.on("success", function (e) {
  log("复制结果成功");
});
clipboard.on("error", function (e) {
  log("复制结果失败");
});

// 下载按钮事件处理
document.getElementById("download").addEventListener("click", () => {
  let ass = document.getElementById("ass").value;
  if (ass !== "") {
    download(`Generated_${new Date().getTime()}.ass`, ass); // 以时间戳命名
  } else {
    log("尚未生成 ASS 内容!", true);
  }
});

// 保存 ASS 文件
function download(filename, text) {
  if (localStorage.getItem("aegisub")) {
    mdui.alert(
      `虽然但是，这样下载的文件不能用喔... <br>您已打开 【仅生成可粘贴至 Aegisub 的内容】`
    );
  }
  var pom = document.createElement("a");
  pom.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  pom.setAttribute("download", filename);
  var event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  pom.dispatchEvent(event);
}

// 拖入文件
var srtInput = document.getElementById("srt");
document.ondrop = function (e) {
  e.preventDefault();
}; // 取消浏览器默认事件
document.ondragover = function (e) {
  e.preventDefault();
}; // 取消浏览器默认事件
srtInput.ondragenter = function () {
  document
    .getElementById("srt-element-father")
    .classList.add("mdui-textfield-focus");
};
srtInput.ondragleave = function () {
  document
    .getElementById("srt-element-father")
    .classList.remove("mdui-textfield-focus");
};
srtInput.ondrop = function (e) {
  var fr = new FileReader();
  fr.readAsText(e.dataTransfer.files[0]);
  fr.onload = function () {
    srtInput.value = fr.result;
  };
};

// 点击转换按钮时的事件处理
document.getElementById("go").addEventListener("click", () => {
  let srt = document.getElementById("srt").value;
  let style =
    localStorage.getItem("customBracketStyle") !== ""
      ? localStorage.getItem("customBracketStyle")
      : "Top";
  if (srt !== "") {
    let ass = srtToAss(srt, style); // 按照设置处理 SRT
    document.getElementById("ass").value = ass; // 输出 ASS
  } else {
    log("请填入 SRT 字幕正文", true);
  }
});

// 封装一个 Log 函数
function log(log, snackbar = false) {
  let logBox = document.getElementById("log");
  logBox.insertAdjacentHTML("beforeend", log + "<br>");
  console.log(log);
  if (snackbar)
    mdui.snackbar({
      message: log,
    });
}

function srtToAss(srt, style) {
  // SRT 转 ASS 的函数

  let parsedSrt = parser.fromSrt(srt); // 解析 srt 为一个对象数组

  /*
      拆分多行：把每个srt字幕的时间和内容转为一个新对象插入数组，
      若这个srt字幕包含换行符号，则将这个srt字幕的内容每行拆开，将每行用分别用相同时间的新对象插入数组
  
      Split: make a new object which contains the time and content of each srt line,
      then insert the new object into the array. if the srt line contains \n,
      then split the srt line into several lines, and insert the new object into the array (each line has same time)
  */

  let newSubtitleArray = new Array();

  for (let i in parsedSrt) {
    if (parsedSrt[i].text.includes("\n")) {
      // 如果这个srt字幕包含换行符号
      let lines = parsedSrt[i].text.split("\n"); // 拆分srt字幕
      log(`[拆分多行][${i}] ${JSON.stringify(lines)}`);

      // 新增：合并中文台词的两行
      for (let j = 0; j < lines.length - 1; j++) {
        // 检查当前行和下一行是否包含中文标点符号
        const chinesePunctuation = /[，。！？；：、（）《》【】“”‘’]/;
        const currentLineEndsWithPunctuation = chinesePunctuation.test(
          lines[j].slice(-1)
        );
        const nextLineStartsWithPunctuation = chinesePunctuation.test(
          lines[j + 1].charAt(0)
        );

        if (
          lines[j].match(/[\u4e00-\u9fff]/) && // 当前行包含汉字
          lines[j + 1].match(/[\u4e00-\u9fff]/) && // 下一行也包含汉字
          !currentLineEndsWithPunctuation && // 当前行不以中文标点结尾
          !nextLineStartsWithPunctuation // 下一行不以中文标点开头
        ) {
          lines[j] = lines[j] + "　" + lines[j + 1]; // 用全角空格连接
          lines.splice(j + 1, 1); // 删除下一行
          j--; // 调整索引
        }
      }

      for (let j = 0; j < lines.length; j++) {
        // 循环拆开后的每一行
        if (
          lines[j].match(/\(|（/g) && // 如果这一行包含左括号
          lines[j].match(/\)|）/g) == null && // 但不包含右括号
          lines[j + 1].match(/\(|（/g) == null && // 下行不包含左括号
          lines[j + 1].match(/\)|）/g) // 但是包含右括号
        ) {
          let newSubtitle = {
            // 对跨行括号进行操作之前，先把原始的内容作为注释插入数组
            startTime: parsedSrt[i].startTime, // 引用原来的时间
            endTime: parsedSrt[i].endTime,
            text: lines[j], // 被分割的这一行
            style: "Default",
            comment: true, // 注释
          };
          let newSubtitle2 = {
            startTime: parsedSrt[i].startTime,
            endTime: parsedSrt[i].endTime,
            text: lines[j + 1], // 被分割的这一行的下一行
            style: "Default",
            comment: true,
          };
          newSubtitleArray.push(newSubtitle, newSubtitle2); // 插入数组

          log(
            `[合并跨行括号][${i}] ${JSON.stringify([lines[j], lines[j + 1]])}`
          );
          lines[j] = lines[j] + lines[j + 1]; // 将下一行的内容拼接到这一行
          lines.splice(j + 1, 1); // 删除下一行
        }
        let newSubtitle = {
          startTime: parsedSrt[i].startTime, // 引用原来的时间
          endTime: parsedSrt[i].endTime,
          text: lines[j], // 被分割的这一行
          style: "Default",
          comment: false,
        };
        newSubtitleArray.push(newSubtitle);
      }
    } else {
      // 不包含换行符的时候
      let thisSrtLine = {
        startTime: parsedSrt[i].startTime,
        endTime: parsedSrt[i].endTime,
        text: parsedSrt[i].text,
        style: "Default",
        comment: false,
      };
      newSubtitleArray.push(thisSrtLine);
    }
  }

  /*
      多重对话处理：
        1.
        删除残留横杠：只适用于本来 SRT 中有多行多对话，但被上面的代码自动拆成多个字幕，
        现在单行残留一个 - 的情况。一行中有双对话的情况会在后面处理。
        2.
        分割单行多重对话：如果需要，将字幕中出现的单行多对话拆开，每个对话一个字幕。
        (如：“-那个打扮成孔明的人没在啊 -请为双方献上掌声” ==> “那个打扮成孔明的人没在啊” “请为双方献上掌声”，变为两个字幕)
 
  */

  for (let i in newSubtitleArray) {
    // 删除残留横杠
    if (
      newSubtitleArray[i].text.startsWith("-") &&
      newSubtitleArray[i].text.split("-").length == 2
    ) {
      log(
        `[删除残留横杠][${i}] ${newSubtitleArray[i].text} 的开头是 - 且是一个单独对话，移除...`
      );
      newSubtitleArray[i].text = newSubtitleArray[i].text.replace(/^-/, ""); // 直接替换字幕数组的文本内容，不需要新建字幕
    }

    // 处理单行多对话
    let splitThisLine = newSubtitleArray[i].text.split("-");
    // 如果单行字幕包含了双对话 (用-分割，如果有俩-，那么分割出来的应该是一个空字符和两个对话)
    if (
      splitThisLine.length >= 3 &&
      splitThisLine[0] == "" &&
      splitThisLine[1] != "" &&
      splitThisLine[2] != ""
    ) {
      log(
        `[单行多重对话][行 ${i}] ${newSubtitleArray[i].text} 可能为多重对话，准备拆分`
      );
      splitThisLine.splice(0, 1); // 删除第一个空字符
      // 循环拆分出来的每一个对话
      for (let j = 0; j < splitThisLine.length; j++) {
        splitThisLine[j] = splitThisLine[j].trim(); // 去除前后空格
        log(`[单行多重对话][行 ${i}] 拆分单行(${j}): ${splitThisLine[j]}`);
        let thisNewSubtitle = {
          startTime: newSubtitleArray[i].startTime,
          endTime: newSubtitleArray[i].endTime,
          text: splitThisLine[j],
          style: "Default",
          comment: false,
        };
        newSubtitleArray.splice(parseInt(i) + 1, 0, thisNewSubtitle); // 在父遍历字幕的后面插入新的字幕
        newSubtitleArray[i].comment = true; // 注释掉父遍历字幕
      }
    }
  }

  /*
      合并字幕：遍历所有字幕，即父遍历；父遍历下进行子遍历，也遍历所有字幕。
      如果子遍历字幕的开始时间和当前父遍历字幕的结束时间相同，且他们的内容一样，则将他们合并，
      避免重复字幕出现。
  */

  for (let i in newSubtitleArray) {
    // 父遍历
    for (let j = 0; j < newSubtitleArray.length; j++) {
      // 子遍历，同上，涉及到对循环变量数字操作的 for 都只能这样用。
      // 如果子遍历字幕的开始时间和当前父遍历字幕的结束时间相同，且他们的内容一样，则将他们合并
      if (
        newSubtitleArray[j].startTime == newSubtitleArray[i].endTime &&
        newSubtitleArray[j].text == newSubtitleArray[i].text
      ) {
        if (!newSubtitleArray[i].comment)
          // 仅输出不是注释行的合并日志
          log(
            `[合并分裂行][${i} ==> ${j}](${newSubtitleArray[i].endTime} => ${newSubtitleArray[j].endTime}) ${newSubtitleArray[j].text}`
          );
        newSubtitleArray[i].endTime = newSubtitleArray[j].endTime; // 将子遍历字幕的结束时间赋值给父遍历字幕
        newSubtitleArray.splice(j, 1); // 删除子遍历字幕
        j = j - 1; // 子遍历字幕的索引减一
      }
    }
  }

  /*
      为括号行指定样式
  */

  if (localStorage.getItem("bracketStyle") == "true") {
    for (let i in newSubtitleArray) {
      let thisLineTest = newSubtitleArray[i].text;
      if (
        (thisLineTest.startsWith("(") && thisLineTest.endsWith(")")) ||
        (thisLineTest.startsWith("（") && thisLineTest.endsWith("）"))
      ) {
        log(`[括号行样式][行 ${i}] ${thisLineTest} 更换为 ${style} 样式`);
        newSubtitleArray[i].style = style;
      }
    }
  }

  /*
      替换全角空格
  */
  if (localStorage.getItem("spaceReplace") == "true") {
    for (let i in newSubtitleArray) {
      newSubtitleArray[i].text = newSubtitleArray[i].text.replace(/ /g, "　");
    }
  }

  /*
      如果开启了引号替换，则执行此函数替换引号
  */
  if (localStorage.getItem("quoteReplace") == "true") {
    for (let i in newSubtitleArray) {
      if (newSubtitleArray[i].text.match(/\“|\”/)) {
        if (!newSubtitleArray[i].comment)
          // 仅输出不是注释行的合并日志
          log(`[变成方括号][${i}] ${newSubtitleArray[i].text}`);
        newSubtitleArray[i].text = newSubtitleArray[i].text
          .replace(/“/g, "「")
          .replace(/”/g, "」");
      }
    }
  }

  console.log("下方是最终的字幕数组：");
  console.log(newSubtitleArray);

  /*
      第三步：生成 ASS 文件
  */

  let nowTime = new Date(); // 获取当前时间
  let nowTimeText = `${nowTime.toLocaleString("zh-CN", {
    hour12: false,
  })} (${nowTime.getTime()})`;
  let ass = `[Script Info]
; Script generated by LavaAnimeSubTools
; Generate time: ${nowTimeText}
Title: New Subtitle
Original Script: LavaAnimeSubTools
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,更纱黑体 SC Semibold,72,&H00FFFFFF,&H00FFFFFF,&H002A2A2A,&HFF0E0807,0,0,0,0,100,100,1,0,1,3,0,2,135,135,24,1
Style: Top,更纱黑体 SC Semibold,58,&H00FFFFFF,&H00FFFFFF,&H000A0A0A,&HFF0E0807,0,0,0,0,100,100,1,0,1,2,0,8,135,135,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  if (JSON.parse(localStorage.getItem("aegisub"))) {
    ass = "";
  }

  for (let i in newSubtitleArray) {
    let thisStartTime = newSubtitleArray[i].startTime
      .slice(1, 11)
      .replace(",", "."); // 把 SRT 的时间转为 ASS 时间
    let thisEndTime = newSubtitleArray[i].endTime
      .slice(1, 11)
      .replace(",", ".");
    let isThisLineComment = newSubtitleArray[i].comment
      ? "Comment"
      : "Dialogue"; // 判断是否是注释行
    let thisAssLine = `${isThisLineComment}: 0,${thisStartTime},${thisEndTime},${newSubtitleArray[i].style},,0,0,0,,${newSubtitleArray[i].text}\n`;
    ass = ass.concat(thisAssLine);
  }

  if (newSubtitleArray.length == 0) {
    log("没有可以转换的字幕，请检查 SRT 内容！", true);
    return "";
  } else return ass;
}
