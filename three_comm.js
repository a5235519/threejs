var three3D = {
    scene: null,        //场景
    renderer: null,     //渲染
    camera: null,       //相机
    light: null,        //聚光灯
    obj: null,          //3D模型

    raycaster: null,

    // 事件
    clicked: false,      //点击
    device: false,      //陀螺仪启动
    move: true,         //拖拽移动

    objArr: [],   //存放OBJ模型
    jsonArr: false, //存放JSON模型
    fbxArr: false, //存放FBX模型

    $alpha: document.getElementById("alpha"),
    $beta: document.getElementById("beta"),

    clock: new THREE.Clock(),

    lon: -90,            //纬度
    lat: 0,             //经度
    phi: 0,             //方位面(水平面)内的角度  范围 0 ~ 360
    theta: 0,          //俯仰面（垂直面）内的角度  范围0 ~ 180

    mX: 90,
    target: new THREE.Vector3(),
    mouse: new THREE.Vector2(),
    touch: new THREE.Vector2(),

    //创建场景
    initScene: function(){
        three3D.scene = new THREE.Scene();
        three3D.scene.position.set(0,0,0);
        three3D.scene.lookAt(three3D.scene.position);
    },

    //创建3D渲染器
    initThree: function(){
        three3D.renderer = new THREE.WebGLRenderer({
            antialias : true
        });
        three3D.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('container').appendChild( three3D.renderer.domElement );
    },

    //创建相机
    initCamera: function(){
        three3D.camera = new THREE.PerspectiveCamera(45, window.innerWidth/ window.innerHeight, 1, 4000);
        three3D.camera.position.set(0,0,100)
        three3D.camera.lookAt(three3D.camera.position);
    },

    //当屏幕窗口大小改变，使其自动适应
    initResize: function(){
        window.addEventListener('resize', function() {

            three3D.camera.aspect = window.innerWidth / window.innerHeight;
            three3D.camera.updateProjectionMatrix()

            three3D.renderer.setSize( window.innerWidth, window.innerHeight );

        }, false);
    },

    //创建光源
    initLight: function(){

        three3D.light = new THREE.AmbientLight(0xFFffff);
        three3D.scene.add(three3D.light);

    },

    //通过OBJ文件，渲染3D模型
    initOBJ: function(url , fun ){
        var src = {
            texture: url.texture || '',
            mtl: url.mtl || '',
            obj: url.obj || '',
            fun: fun || function(){},
            return: null
        }

        // 贴图文件
        var texture = new THREE.Texture();
        var imgloader = new THREE.ImageLoader();
        imgloader.load( src.texture, function ( image ) {
            texture.image = image;
            texture.needsUpdate = true;
        } );
        // 材质文件
        var mtlloader = new THREE.MTLLoader();
        mtlloader.load( src.mtl, function(mtl){
            mtl.preload();
            // 3D模型文件
            var loader = new THREE.OBJLoader();
            loader.setMaterials(mtl);
            loader.load(src.obj, function(girlObj){
                girlObj.traverse( function ( child ) {
                    if ( child instanceof THREE.Mesh ) {
                        child.material.map = texture;
                    }
                });

                three3D.obj = girlObj;

                src.fun(girlObj);
                three3D.scene.add(girlObj);
            });
        });
    },

    // 加载FBXjson文件
    FBXLoader: function(url, callback){
        var loader =  new THREE.JSONLoader();
        loader.load( url, function(geometry, materials){

            // 平滑
            geometry.computeVertexNormals();

            // 绑定蒙皮
            for(var i = 0; i < materials.length; i++) {
                materials[i].skinning = true;
            }
            var material = new THREE.MeshFaceMaterial(materials);
            var mesh = new THREE.SkinnedMesh( geometry, material );

            var mixer = new THREE.AnimationMixer(mesh);
            var firstAnimation = geometry.animations[0];
            // AnimationAction是动作的schedule，之所以叫schedule是因为他可以控制着动画开始 结束 停止 这些流程
            var action = mixer.clipAction(firstAnimation);

            // 接下来可以为这个动画配置一些细节了
            action.clampWhenFinished = true;
            //  0会停止，这里设置为0默认停止，不停要注意其他的地方是否有设置这个值，值越大越快
            // action.setEffectiveTimeScale(0.2);
            action.play();
            mesh.mixer = mixer;
            mesh.action = action;
            three3D.fbxArr = mesh;

            callback();
        });
    },

    // 加载普通json文件
    JSONLoader: function(url, callback){
        var loader =  new THREE.JSONLoader();
        loader.load(url, function(geometry, materials) {
            geometry.computeVertexNormals();
            materials[0].side =  THREE.DoubleSide;
            var material = new THREE.MeshFaceMaterial(materials);
            three3D.jsonArr = new THREE.Mesh(geometry, material);
            callback();
        });
    },

    //性能检测
    initStats: function(){
        three3D.stats = new Stats();
        three3D.stats.domElement.style.position = 'absolute';
        three3D.stats.domElement.style.left = '0px';
        three3D.stats.domElement.style.top = '0px';
        document.getElementById('container').appendChild(three3D.stats.domElement);
    },

    initHelper: function(){
        var gridHelper = new THREE.GridHelper(500, 10); // 500 is grid size, 20 is grid step
        gridHelper.position = new THREE.Vector3(0, 0, 0);
        gridHelper.rotation = new THREE.Euler(0, 0, 0);
        three3D.scene.add(gridHelper);
        var gridHelper2 = gridHelper.clone();
        gridHelper2.rotation = new THREE.Euler(Math.PI / 2, 0, 0);
        three3D.scene.add(gridHelper2);
        var gridHelper3 = gridHelper.clone();
        gridHelper3.rotation = new THREE.Euler(Math.PI / 2, 0, Math.PI / 2);
        three3D.scene.add(gridHelper3);
    },

    // 360度全景天空盒
    makeSkybox: function(urls, size){
        var skyboxCubemap = new THREE.CubeTextureLoader().load( urls );
        skyboxCubemap.format = THREE.RGBFormat;

        var skyboxShader = THREE.ShaderLib['cube'];
        skyboxShader.uniforms['tCube'].value = skyboxCubemap;
        console.log('执行了添加天空盒子语句');

        return new THREE.Mesh(
                new THREE.BoxGeometry( size, size, size ),
                new THREE.ShaderMaterial({
                    fragmentShader : skyboxShader.fragmentShader,
                    vertexShader : skyboxShader.vertexShader,
                    uniforms : skyboxShader.uniforms,
                    depthWrite : false,
                    side : THREE.BackSide
                })
        );
    },

    //控制天空盒
    skybox_val: function(){
        if(three3D.clicked == true){
            three3D.lon = parseFloat(three3D.lon).toFixed(1);  //x
            three3D.lat = parseFloat(three3D.lat).toFixed(1);  //y
            three3D.lat = Math.max(-85, Math.min(85, three3D.lat));
            three3D.phi = THREE.Math.degToRad( 90 - three3D.lat );
            three3D.theta = THREE.Math.degToRad( three3D.lon );
        }else{
            three3D.lon = THREE.Math.radToDeg(three3D.theta);
            three3D.lat = 90-THREE.Math.radToDeg(three3D.phi);
        }

        three3D.target = three3D.targetTo(three3D.theta,three3D.phi);
        three3D.camera.lookAt( three3D.target );
    },

    //点击射线
    initRaycaster: function(){
        three3D.raycaster = new THREE.Raycaster();
    },

    // 陀螺仪
    initDeviceOrientation: function(){
        three3D.device == true ? three3D.device = new THREE.DeviceOrientationControls( three3D.camera ) : '';
    },

    // 动画
    animation: function(){
        three3D.render();
        requestAnimationFrame(three3D.animation);
        TWEEN.update();
        three3D.stats.update();
    },

    // Tween方法
    createTween: function(start,end,timer,delay,callback){
        new TWEEN.Tween(start)
                .to(end, timer)
                .easing(TWEEN.Easing.Exponential.In)
                .delay(delay)
                .onUpdate(callback).start();
    },

    // 对像素单独控制
    pixel: function(index){
        three3D.cloud.geometry.vertices.forEach(function(t,i){
            var start_pos = {
                x: t.x,
                y: t.y,
                z: t.z
            }
            var end_pos = {
                x: three3D.vArr[index][i].x+200,
                y: three3D.vArr[index][i].y+50,
                z: three3D.vArr[index][i].z-450
            }

            three3D.createTween(
                start_pos,
                end_pos,
                Math.random()*500+500,
                500*Math.random(),
                function(){
                    t.x = this.x;
                    t.y = this.y;
                    t.z = this.z;
                    // 更新顶点 如果失去这块 则粒子无法动起来
                    three3D.cloud.geometry.verticesNeedUpdate = true;
                }
            )
        });
    },

    //渲染
    render: function(){
        three3D.skybox_val();
        three3D.renderer.render(three3D.scene, three3D.camera);
    },

    //事件监听 移动触发
    addListnerMove: function($el){
        if($el == undefined){
            $el = window;
        }
//        $el.addEventListener('click', this.onDocumentClick, false);
        $el.addEventListener('mousedown', this.onDocumentMouseDown, false);
//        $el.addEventListener('mousewheel', this.onDocumentMouseWheel, false);
        $el.addEventListener('touchstart', this.onDocumentTouchStart, false);
        $el.addEventListener('touchmove', this.onDocumentTouchMove, false);
    },

    onDocumentMouseDown: function(){
        document.addEventListener( 'mousemove', three3D.onDocumentMouseMove , false );
        document.addEventListener( 'mouseup', three3D.onDocumentMouseUp , false );
    },

    onDocumentMouseMove: function(event){
        event.preventDefault();

        three3D.movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        three3D.movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        three3D.lon -= three3D.movementX * 0.1;
        three3D.lat += three3D.movementY * 0.1;
    },

    onDocumentMouseUp: function(event){
        three3D.clicked = true;
        three3D.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        three3D.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        document.removeEventListener( 'mousemove', three3D.onDocumentMouseMove );
        document.removeEventListener( 'mouseup', three3D.onDocumentMouseUp );
    },

    onDocumentTouchStart: function(event) {
//        event.preventDefault();
        var touch = event.touches[0];
        three3D.touch.x = touch.screenX;
        three3D.touch.y = touch.screenY;
    },

    onDocumentTouchMove: function(event) {
//        event.preventDefault();
        var touch = event.touches[0];
        three3D.lon -= (touch.screenX - three3D.touch.x) * 0.1;
        three3D.lat += (touch.screenY - three3D.touch.y) * 0.1;
        three3D.touch.x = touch.screenX;
        three3D.touch.y = touch.screenY;

        event.preventDefault();
    },

    onDocumentMouseWheel: function(event) {
        three3D.camera.fov -= event.wheelDeltaY * 0.05;
        if (three3D.camera.fov < 10) three3D.camera.fov = 10;
        if (three3D.camera.fov > 100) three3D.camera.fov = 100;
        three3D.camera.updateProjectionMatrix();
    },

    onDocumentClick: function(event){
        three3D.iclicked();
    },

    // 识别当前点击对象
    iclicked: function(){
        if(three3D.clicked == false) return false;
        three3D.clicked = false;
        three3D.raycaster.setFromCamera(three3D.mouse, three3D.camera);
        var intersects = three3D.raycaster.intersectObjects(three3D.objArr,true);
        if(intersects.length > 0){
            console.log(1)
            three3D.module_position(intersects[0]);
        }
        three3D.clicked = true;
    },

    //Theta 垂直角   phi 水平角
    // 根据对象的 POINT 坐标返回出对应的 Theta 和 Phi 的值
    rotateTo: function(pointX,pointY,pointZ){
        return {
            theta : Math.atan2(pointZ,pointX),
            phi : Math.atan2(pointZ,pointY)
        }
    },

    // 根据theta,phi返回相机target值
    targetTo: function(theta,phi){
        //X=sinφcosθ y=cosφ z=sinφ*sinθ
        return{
            x:parseFloat( ( Math.sin( phi ) * Math.cos( theta ) ).toFixed(3) ),
            y:parseFloat( ( Math.cos( phi ) ).toFixed(3) ),
            z:parseFloat( ( Math.sin( phi ) * Math.sin( theta )).toFixed(3) )
        }
    },

    //
    get3DAxis: function(theta,phi,r){
        //X=rsinθcosφ y=rsinθsinφ z=rcosθ
        return{
            x:r*Math.cos(theta),
            y:r*Math.sin(theta)*Math.cos(phi),
            z:r*Math.sin(theta)*Math.sin(phi)
        }
    },

    getAngle: function(theta,phi){
        return{
            lat: 90-THREE.Math.radToDeg(phi),
            lon: THREE.Math.radToDeg(theta)
        }
    },

    // 模型围绕物体移动
    module_moveBox: function(obj,$x,$y,$z){
        var theta = THREE.Math.degToRad( $x );
        var phi = THREE.Math.degToRad( 90 - $y );
        var point = three3D.get3DAxis(theta,phi,$z);
        three3D.objArr[0].position.x = point.z;
        three3D.objArr[0].position.y = point.x;
        three3D.objArr[0].position.z = point.y;
    },

    // 将模型居中于屏幕中间
    module_centerBox: function($theta,$phi,$z){
        var point = three3D.get3DAxis($theta,$phi,$z);
        three3D.objArr[0].position.x = point.z;
        three3D.objArr[0].position.y = point.x;
        three3D.objArr[0].position.z = point.y;
    },

    // 将焦点定位到指定模型位置
    module_position: function(obj){
        var point = obj.point;
        var position = three3D.rotateTo(point.x,point.y,point.z);
        three3D.theta = position.theta;
        three3D.phi = position.phi;
        three3D.skybox_val()
    },

    // 创建几何图形组
    addGeometry: function(){
        three3D.geom = new THREE.Geometry();
    },

    // 创造点
    addPointer: function(){
        // 像素材质
        three3D.materialOBJ = new THREE.PointsMaterial({size: 2, color: 0xffffff});
    },

    // 通过JS文件，渲染3D模型
    addModelToScene: function(geometry){
        geometry.vertices.forEach(function(){
            three3D.geom.colors.push(new THREE.Color(0xffffff));
        });
        // 存值
        three3D.vArr.push(geometry.vertices);
        three3D.vNum.push(geometry.vertices.length);
        // JS全部渲染完成
        if(three3D.vNum.length == three3D.objLength){
            // 取出最大数组下标
            var index = three3D.arrMax(three3D.vArr)
            // 首次加载第二个模型
            var starVertices = three3D.vArr[0];
            // 循环最大个数
            three3D.vArr[index].forEach(function(t,i,arr){
                three3D.addVertices(i,starVertices,arr);    // 给几何体添加顶点坐标
            });

            three3D.cloud = new THREE.Points(three3D.geom, three3D.materialOBJ);
            three3D.cloud.position.z = -50;
            three3D.cloud.position.y = -50;
            three3D.scene.add(three3D.cloud);

            setTimeout(function(){
                three3D.pixel(1);
            },1000)
        }
    },

    // 取出最大顶点数组下标
    arrMax: function(arr){
        var max = Math.max.apply(null, three3D.vNum);
        var len = arr.length;
        var index = -1;
        for (var i = 1; i < len; i++){
            if (arr[i].length == max) {
                index = i;
                break;
            }
        }
        return index;
    },

    addVertices: function(i,starVertices,arr){
        var particle;
        var max = arr.length;
        if(i <= max-1){
            if(i <= starVertices.length-1){
                particle = new THREE.Vector3(starVertices[i].x, starVertices[i].y, starVertices[i].z);
            }else{
                // 多余顶点随机分配重复坐标
                var ran = Math.floor(Math.random()*starVertices.length);
                particle = new THREE.Vector3(starVertices[ran].x, starVertices[ran].y, starVertices[ran].z);
            }
        }
        //
        three3D.geom.vertices.push(particle);
    }
}